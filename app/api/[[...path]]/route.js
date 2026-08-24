import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
import { NextResponse } from 'next/server'
import { SPORTS, getSportById } from '@/lib/sports-data'
import { uploadVideoToGemini, analyzeVideoWithGemini, chatAboutVideo, compareAnalysesWithGemini } from '@/lib/gemini-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

// Custom error class for validation errors
class ValidationError extends Error {
  constructor(message) {
    super(message)
    this.name = 'ValidationError'
  }
}

const FALLBACK_MODEL = 'gemini-3.6-flash'

// Runs fn(model) with the requested model; if it fails with a 429 (rate limit/quota) and the
// requested model isn't already the fallback, automatically retries once on the fallback model.
async function withModelFallback(fn, requestedModel) {
  try {
    const result = await fn(requestedModel)
    return { result, modelUsed: requestedModel, fallbackApplied: false }
  } catch (err) {
    if (err?.status === 429 && requestedModel !== FALLBACK_MODEL) {
      const result = await fn(FALLBACK_MODEL)
      return { result, modelUsed: FALLBACK_MODEL, fallbackApplied: true }
    }
    throw err
  }
}

// MongoDB connection (promise-based singleton to avoid race conditions on concurrent requests)
let dbPromise

async function connectToMongo() {
  if (!dbPromise) {
    const client = new MongoClient(process.env.MONGO_URL)
    dbPromise = client.connect().then((c) => c.db(process.env.DB_NAME))
  }
  return dbPromise
}

function handleCORS(response) {
  response.headers.set('Access-Control-Allow-Origin', process.env.CORS_ORIGINS || '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-gemini-api-key')
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  return response
}

export async function OPTIONS() {
  return handleCORS(new NextResponse(null, { status: 200 }))
}

function getApiKey(request) {
  const key = request.headers.get('x-gemini-api-key')
  if (!key || key.trim().length < 10) {
    throw new ValidationError('A valid Gemini API key is required. Connect one in the BYOK vault.')
  }
  return key.trim()
}

async function handleRoute(request, { params }) {
  const { path = [] } = await params
  const route = `/${path.join('/')}`
  const method = request.method

  try {
    const db = await connectToMongo()

    if ((route === '/' || route === '/root') && method === 'GET') {
      return handleCORS(NextResponse.json({ message: 'SportVision AI Pro API' }))
    }

    if (route === '/sports' && method === 'GET') {
      return handleCORS(NextResponse.json(SPORTS))
    }

    if (route === '/history' && method === 'GET') {
      const docs = await db.collection('analyses')
        .find({})
        .project({ id: 1, sportId: 1, sportName: 1, sportEmoji: 1, model: 1, fileName: 1, createdAt: 1, 'analysis.summary': 1 })
        .sort({ createdAt: -1 })
        .limit(20)
        .toArray()
      const clean = docs.map(({ _id, ...rest }) => rest)
      return handleCORS(NextResponse.json(clean))
    }

    if (path[0] === 'analysis' && path[1] === 'start' && method === 'POST') {
      const apiKey = getApiKey(request)
      const formData = await request.formData()
      const video = formData.get('video')
      const sportId = formData.get('sportId')
      const requestedModelInput = formData.get('model')
      const requestedModel = requestedModelInput === 'gemini-3.1-pro-preview' ? 'gemini-3.1-pro-preview' : 'gemini-3.6-flash'

      if (!video || typeof video === 'string' || !video.arrayBuffer) {
        return handleCORS(NextResponse.json({ error: 'A video file is required.' }, { status: 400 }))
      }
      if (video.type && !video.type.startsWith('video/')) {
        return handleCORS(NextResponse.json({ error: 'Only video files are accepted.' }, { status: 400 }))
      }
      if (video.size > 150 * 1024 * 1024) {
        return handleCORS(NextResponse.json({ error: 'Video exceeds the 150MB limit for this environment. Please use a shorter/smaller clip.' }, { status: 400 }))
      }
      const sport = getSportById(sportId)
      if (!sport) {
        return handleCORS(NextResponse.json({ error: 'Unknown sport selected.' }, { status: 400 }))
      }

      const file = await uploadVideoToGemini(apiKey, video, video.type || 'video/mp4', video.name || 'upload.mp4')
      const { result: analysis, modelUsed, fallbackApplied } = await withModelFallback(
        (m) => analyzeVideoWithGemini({ apiKey, model: m, file, sport }),
        requestedModel
      )

      const doc = {
        id: uuidv4(),
        sportId: sport.id,
        sportName: sport.name,
        sportEmoji: sport.emoji,
        model: modelUsed,
        requestedModel,
        fallbackApplied,
        fileName: video.name || 'upload.mp4',
        fileUri: file.uri,
        mimeType: file.mimeType || video.type || 'video/mp4',
        analysis,
        chatHistory: [],
        createdAt: new Date(),
      }
      await db.collection('analyses').insertOne(doc)
      const { _id, ...clean } = doc
      return handleCORS(NextResponse.json(clean))
    }

    if (path[0] === 'analysis' && path[1] && path[2] === 'chat' && method === 'POST') {
      const apiKey = getApiKey(request)
      const body = await request.json()
      const question = (body.question || '').trim()
      if (!question) {
        return handleCORS(NextResponse.json({ error: 'A question is required.' }, { status: 400 }))
      }
      const doc = await db.collection('analyses').findOne({ id: path[1] })
      if (!doc) {
        return handleCORS(NextResponse.json({ error: 'Analysis not found.' }, { status: 404 }))
      }
      const sport = getSportById(doc.sportId) || { name: doc.sportName }
      const { result: answer, modelUsed, fallbackApplied } = await withModelFallback(
        (m) => chatAboutVideo({
          apiKey,
          model: m,
          fileUri: doc.fileUri,
          mimeType: doc.mimeType,
          analysis: doc.analysis,
          sport,
          question,
          history: doc.chatHistory,
        }),
        doc.model
      )
      const now = new Date()
      const update = { $push: { chatHistory: { $each: [{ role: 'user', text: question, ts: now }, { role: 'model', text: answer, ts: now }] } } }
      if (fallbackApplied) update.$set = { model: modelUsed }
      await db.collection('analyses').updateOne({ id: path[1] }, update)
      return handleCORS(NextResponse.json({ answer, fallbackApplied }))
    }

    if (path[0] === 'analysis' && path[1] && path[2] === 'chat' && method === 'GET') {
      const doc = await db.collection('analyses').findOne({ id: path[1] })
      if (!doc) {
        return handleCORS(NextResponse.json({ error: 'Analysis not found.' }, { status: 404 }))
      }
      return handleCORS(NextResponse.json(doc.chatHistory || []))
    }

    if (path[0] === 'analysis' && path[1] && !path[2] && method === 'GET') {
      const doc = await db.collection('analyses').findOne({ id: path[1] })
      if (!doc) {
        return handleCORS(NextResponse.json({ error: 'Analysis not found.' }, { status: 404 }))
      }
      const { _id, ...clean } = doc
      return handleCORS(NextResponse.json(clean))
    }

    if (path[0] === 'analysis' && path[1] === 'compare' && method === 'POST') {
      const apiKey = getApiKey(request)
      const body = await request.json()
      const { idA, idB } = body
      if (!idA || !idB) {
        return handleCORS(NextResponse.json({ error: 'Both session IDs (idA and idB) are required.' }, { status: 400 }))
      }
      if (idA === idB) {
        return handleCORS(NextResponse.json({ error: 'Please pick two different sessions to compare.' }, { status: 400 }))
      }
      const [docA, docB] = await Promise.all([
        db.collection('analyses').findOne({ id: idA }),
        db.collection('analyses').findOne({ id: idB }),
      ])
      if (!docA) return handleCORS(NextResponse.json({ error: 'Session A not found.' }, { status: 404 }))
      if (!docB) return handleCORS(NextResponse.json({ error: 'Session B not found.' }, { status: 404 }))
      const sportA = getSportById(docA.sportId) || { id: docA.sportId, name: docA.sportName }
      const sportB = getSportById(docB.sportId) || { id: docB.sportId, name: docB.sportName }
      const requestedModel = body.model === 'gemini-3.1-pro-preview' ? 'gemini-3.1-pro-preview' : 'gemini-3.6-flash'
      const { result: comparison, modelUsed, fallbackApplied } = await withModelFallback(
        (m) => compareAnalysesWithGemini({ apiKey, model: m, sportA, sportB, analysisA: docA.analysis, analysisB: docB.analysis }),
        requestedModel
      )
      return handleCORS(NextResponse.json({ comparison, modelUsed, fallbackApplied }))
    }

    return handleCORS(NextResponse.json({ error: `Route ${route} not found` }, { status: 404 }))
  } catch (error) {
    console.error('API Error:', error.message)
    const status = error instanceof ValidationError ? 400 : (error.status || 500)
    const message = String(error.message || 'Something went wrong. Please try again.').slice(0, 400)
    return handleCORS(NextResponse.json({ error: message }, { status }))
  }
}

export const GET = handleRoute
export const POST = handleRoute
export const PUT = handleRoute
export const DELETE = handleRoute
export const PATCH = handleRoute

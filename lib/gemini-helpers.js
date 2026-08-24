import { GoogleGenAI, createPartFromUri, createUserContent } from '@google/genai'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Converts raw Gemini SDK / API errors (often giant nested JSON blobs) into a short,
// human-readable message + an appropriate HTTP status code. Never leak raw JSON to the UI.
export function toCleanGeminiError(err) {
  const raw = String(err?.message || err || '')
  let parsed = null
  const jsonStart = raw.indexOf('{')
  if (jsonStart !== -1) {
    try { parsed = JSON.parse(raw.slice(jsonStart)) } catch (e) { parsed = null }
  }
  const code = parsed?.error?.code || err?.status || null
  const status = parsed?.error?.status || ''

  if (code === 429 || status === 'RESOURCE_EXHAUSTED' || /rate.?limit|quota/i.test(raw)) {
    return { code: 429, message: 'This Gemini model is rate-limited or out of free quota on your API key right now. Wait a minute and retry, or switch to Gemini 3.6 Flash in the BYOK vault.' }
  }
  if (code === 401 || /api key not valid|api_key_invalid/i.test(raw)) {
    return { code: 401, message: 'Your Gemini API key looks invalid or expired. Please check it in the BYOK vault.' }
  }
  if (code === 403 || status === 'PERMISSION_DENIED') {
    return { code: 403, message: 'Your Gemini API key does not have access to this model. Try a different model or key.' }
  }
  if (code === 404 || status === 'NOT_FOUND') {
    return { code: 404, message: 'The selected Gemini model is unavailable right now. Try switching models in the BYOK vault.' }
  }
  if (code === 400 || status === 'INVALID_ARGUMENT') {
    return { code: 400, message: 'Gemini could not process this request (the video format or size may be unsupported).' }
  }
  return { code: code || 502, message: 'Gemini could not complete the analysis right now. Please try again in a moment.' }
}

export const ANALYSIS_JSON_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    radar: {
      type: 'object',
      properties: {
        power: { type: 'number' },
        accuracy: { type: 'number' },
        consistency: { type: 'number' },
        agility: { type: 'number' },
        formIntegrity: { type: 'number' },
        stamina: { type: 'number' },
      },
      required: ['power', 'accuracy', 'consistency', 'agility', 'formIntegrity', 'stamina'],
    },
    metrics: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          value: { type: ['number', 'null'] },
          unit: { type: 'string' },
          confidence: { type: 'number' },
          evidence: { type: 'string' },
        },
        required: ['name', 'unit', 'confidence', 'evidence'],
      },
    },
    events: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          timestampSeconds: { type: 'number' },
          confidence: { type: 'number' },
          description: { type: 'string' },
          severity: { type: 'string', enum: ['good', 'neutral', 'warning'] },
        },
        required: ['type', 'timestampSeconds', 'confidence', 'description', 'severity'],
      },
    },
    insights: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          finding: { type: 'string' },
          confidence: { type: 'number' },
          limitation: { type: 'string' },
          category: { type: 'string', enum: ['biomechanics', 'tactical', 'injury_prevention', 'technique'] },
        },
        required: ['title', 'finding', 'confidence', 'category'],
      },
    },
    unavailableMetrics: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary', 'radar', 'metrics', 'events', 'insights', 'unavailableMetrics'],
}

export function buildAnalysisPrompt(sport) {
  return `You are SportVision AI Pro, an expert ${sport.name} performance biomechanics analyst reviewing an uploaded video.
Sport: ${sport.name} (${sport.category})
Context: ${sport.description}
Suggested metrics to look for if visible (only report if there is real visual evidence): ${sport.focusMetrics.join(', ')}.

Instructions:
- Watch the entire video and identify the athlete(s) and key movements.
- Populate "radar" with six 0-100 scores: power, accuracy, consistency, agility, formIntegrity, stamina - based purely on what is visible in the footage.
- Populate "metrics" with 4-8 concrete, sport-relevant measurements you can estimate from the footage. Use null for value if not estimable, but still explain in "evidence" what you observed.
- Populate "events" with 4-10 key timestamped moments (timestampSeconds relative to video start, as a number), each tagged severity: "good" (strong technique), "neutral" (routine action), or "warning" (technique flaw / injury risk).
- Populate "insights" with 3-6 coaching-grade findings, each tagged category: biomechanics, tactical, injury_prevention, or technique. Always include a "limitation" noting what would need real sensors/lab equipment to confirm.
- Populate "unavailableMetrics" with 3-6 metrics that cannot be measured from video alone (e.g. ground reaction force, heart rate, ball spin rate, muscle activation) relevant to ${sport.name}.
- Every confidence value must be between 0 and 1 and reflect genuine certainty, not a placeholder.
- Never fabricate precision beyond what the video evidence supports. Do not provide medical diagnoses, only performance/technique observations.
Return ONLY JSON matching the provided schema.`
}

export async function uploadVideoToGemini(apiKey, videoBlob, mimeType, displayName) {
  try {
    const ai = new GoogleGenAI({ apiKey })
    const uploaded = await ai.files.upload({ file: videoBlob, config: { mimeType, displayName } })
    let file = uploaded
    let attempts = 0
    while (file.state === 'PROCESSING' && attempts < 40) {
      await sleep(3000)
      file = await ai.files.get({ name: uploaded.name })
      attempts += 1
    }
    if (file.state !== 'ACTIVE') {
      const e = new Error('Gemini could not finish processing the video. Try a shorter or smaller clip.')
      e.status = 502
      throw e
    }
    return file
  } catch (err) {
    if (err?.status && !String(err.message).includes('{')) throw err
    const clean = toCleanGeminiError(err)
    const e = new Error(clean.message)
    e.status = clean.code
    throw e
  }
}

export async function analyzeVideoWithGemini({ apiKey, model, file, sport }) {
  try {
    const ai = new GoogleGenAI({ apiKey })
    const prompt = buildAnalysisPrompt(sport)
    const response = await ai.models.generateContent({
      model,
      contents: createUserContent([createPartFromUri(file.uri, file.mimeType), prompt]),
      config: {
        responseMimeType: 'application/json',
        responseSchema: ANALYSIS_JSON_SCHEMA,
        temperature: 0.25,
        maxOutputTokens: 8192,
      },
    })
    try {
      return JSON.parse(response.text)
    } catch (e) {
      const err = new Error('Gemini returned an unexpected format. Please retry the analysis.')
      err.status = 502
      throw err
    }
  } catch (err) {
    if (err?.status && !String(err.message).includes('{')) throw err
    const clean = toCleanGeminiError(err)
    const e = new Error(clean.message)
    e.status = clean.code
    throw e
  }
}

export async function chatAboutVideo({ apiKey, model, fileUri, mimeType, analysis, sport, question, history }) {
  try {
    const ai = new GoogleGenAI({ apiKey })
    const historyText = (history || [])
      .slice(-6)
      .map((h) => `${h.role === 'user' ? 'Athlete/Coach' : 'AI Analyst'}: ${h.text}`)
      .join('\n')
    const parts = [
      createPartFromUri(fileUri, mimeType),
      `Sport: ${sport?.name || 'Unknown'}. Existing structured analysis (treat as evidence, not absolute fact): ${JSON.stringify(analysis)}`,
    ]
    if (historyText) parts.push(`Conversation so far:\n${historyText}`)
    parts.push(`Answer this question as an expert ${sport?.name || ''} performance analyst grounded in the video. Cite relevant timestamps (mm:ss) where possible. Be concise, specific and honest about uncertainty. Never diagnose injuries, only suggest consulting a professional if relevant.\nQuestion: ${question}`)

    const response = await ai.models.generateContent({
      model,
      contents: createUserContent(parts),
      config: {
        systemInstruction: 'You are SportVision AI, a cautious, expert multi-sport biomechanics and tactics analyst.',
        temperature: 0.4,
        maxOutputTokens: 1024,
      },
    })
    return response.text
  } catch (err) {
    const clean = toCleanGeminiError(err)
    const e = new Error(clean.message)
    e.status = clean.code
    throw e
  }
}


export const COMPARISON_JSON_SCHEMA = {
  type: 'object',
  properties: {
    overallVerdict: { type: 'string' },
    trajectoryDirection: { type: 'string', enum: ['improved', 'declined', 'mixed', 'similar'] },
    performanceSummary: { type: 'string' },
    tacticalDifferences: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          aspect: { type: 'string' },
          sessionA: { type: 'string' },
          sessionB: { type: 'string' },
          verdict: { type: 'string' },
        },
        required: ['aspect', 'sessionA', 'sessionB', 'verdict'],
      },
    },
    techniqueProgression: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          area: { type: 'string' },
          change: { type: 'string', enum: ['improved', 'declined', 'unchanged'] },
          detail: { type: 'string' },
        },
        required: ['area', 'change', 'detail'],
      },
    },
    strengthsA: { type: 'array', items: { type: 'string' } },
    strengthsB: { type: 'array', items: { type: 'string' } },
    weaknessesA: { type: 'array', items: { type: 'string' } },
    weaknessesB: { type: 'array', items: { type: 'string' } },
    recommendations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          priority: { type: 'string', enum: ['high', 'medium', 'low'] },
          title: { type: 'string' },
          detail: { type: 'string' },
        },
        required: ['priority', 'title', 'detail'],
      },
    },
  },
  required: ['overallVerdict', 'trajectoryDirection', 'performanceSummary', 'tacticalDifferences', 'techniqueProgression', 'strengthsA', 'strengthsB', 'weaknessesA', 'weaknessesB', 'recommendations'],
}

export function buildComparisonPrompt(sportA, sportB, analysisA, analysisB) {
  return `You are SportVision AI Pro, an expert sports performance comparison analyst.

You are comparing two training/competition sessions:

SESSION A (Baseline):
Sport: ${sportA.name}
Analysis Summary: ${analysisA.summary}
Radar Scores: ${JSON.stringify(analysisA.radar)}
Metrics: ${JSON.stringify(analysisA.metrics)}
Events: ${JSON.stringify(analysisA.events)}
Insights: ${JSON.stringify(analysisA.insights)}

SESSION B (Latest):
Sport: ${sportB.name}
Analysis Summary: ${analysisB.summary}
Radar Scores: ${JSON.stringify(analysisB.radar)}
Metrics: ${JSON.stringify(analysisB.metrics)}
Events: ${JSON.stringify(analysisB.events)}
Insights: ${JSON.stringify(analysisB.insights)}

Instructions:
- Compare these two sessions holistically: performance, technique, tactics, and biomechanics.
- "overallVerdict": 2-3 sentence high-level comparison verdict.
- "trajectoryDirection": "improved" if Session B is clearly better overall, "declined" if worse, "mixed" if some areas improved and some declined, "similar" if negligible difference.
- "performanceSummary": A detailed 3-5 sentence paragraph on overall performance trajectory across both sessions.
- "tacticalDifferences": 3-5 key tactical/strategic differences observed. For each, describe what happened in Session A vs Session B and give a verdict on which approach was better.
- "techniqueProgression": 3-6 technique areas that changed between sessions. Mark each as improved, declined, or unchanged.
- "strengthsA" / "strengthsB": 3-5 bullet-point strengths for each session.
- "weaknessesA" / "weaknessesB": 2-4 bullet-point weaknesses for each session.
- "recommendations": 3-5 actionable next-step recommendations for the athlete/coach, each with priority (high/medium/low).

Be specific, evidence-based (reference the metrics/events/insights provided), and honest about limitations. ${sportA.id === sportB.id ? '' : 'Note: These sessions involve different sports, so focus on transferable athletic qualities (power, agility, stamina, form, consistency).'}

Return ONLY JSON matching the provided schema.`
}

export async function compareAnalysesWithGemini({ apiKey, model, sportA, sportB, analysisA, analysisB }) {
  try {
    const ai = new GoogleGenAI({ apiKey })
    const prompt = buildComparisonPrompt(sportA, sportB, analysisA, analysisB)
    const response = await ai.models.generateContent({
      model,
      contents: createUserContent([prompt]),
      config: {
        responseMimeType: 'application/json',
        responseSchema: COMPARISON_JSON_SCHEMA,
        temperature: 0.3,
        maxOutputTokens: 8192,
      },
    })
    try {
      return JSON.parse(response.text)
    } catch (e) {
      const err = new Error('Gemini returned an unexpected format for the comparison. Please retry.')
      err.status = 502
      throw err
    }
  } catch (err) {
    if (err?.status && !String(err.message).includes('{')) throw err
    const clean = toCleanGeminiError(err)
    const e = new Error(clean.message)
    e.status = clean.code
    throw e
  }
}

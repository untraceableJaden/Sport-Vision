# SportVision AI Pro

An AI-powered multi-sport video performance analytics platform. Select a sport, upload a training
or match clip, and get a real Gemini multimodal video analysis: a 6-axis kinematic radar, sport
metrics with confidence scores, a timestamped event timeline, coaching insights, and a grounded
Gemini Q&A chat about the footage — plus session comparison and shareable read-only report links.

## Stack

- **Next.js 15** (App Router) for both the frontend and the `/api/*` backend routes
- **MongoDB** for storing analysis results and chat history
- **Google Gemini** (`gemini-3.6-flash` / `gemini-3.1-pro-preview`) via the `@google/genai` SDK —
  **BYOK**: each user supplies their own Gemini API key in the browser (stored in `localStorage`
  only, sent per-request via the `x-gemini-api-key` header, never persisted server-side)
- Tailwind CSS + shadcn/ui, Framer Motion, Recharts, `react-markdown`

## Key features

- 20-sport catalog across Combat / Ball / Racket / Individual categories
- Real Gemini video analysis pipeline (Files API upload → structured JSON `generateContent`)
- Automatic model fallback: if `gemini-3.1-pro-preview` hits a quota/rate-limit error, the request
  automatically retries on `gemini-3.6-flash`
- Results dashboard: radar chart, metric cards, event timeline (click to seek video), insights,
  "not measurable from video" flags
- Grounded Gemini chat about the analyzed video, with Markdown-rendered responses
- Session comparison screen (radar overlay + metric deltas between two analyses)
- Shareable, read-only report links at `/share/[id]`

## Local development

Environment variables live in `.env` (already configured for this environment):

```
MONGO_URL=...
DB_NAME=...
NEXT_PUBLIC_BASE_URL=...
CORS_ORIGINS=*
```

```bash
yarn install
yarn dev
```

## Deploying to Vercel

See [`DEPLOYMENT.md`](./DEPLOYMENT.md) — includes required env vars and an important note about
Vercel's 4.5MB serverless request body limit affecting large video uploads.

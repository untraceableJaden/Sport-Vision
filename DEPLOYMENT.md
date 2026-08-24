# Deploying SportVision AI Pro to Vercel

This is a single Next.js 15 (App Router) app — the frontend and the `/api/*` backend routes
deploy together as one Vercel project (API routes become Vercel Serverless Functions
automatically, no separate backend deployment needed).

## 1. Required environment variables (set in Vercel → Project Settings → Environment Variables)

| Variable | Required | Notes |
|---|---|---|
| `MONGO_URL` | Yes | A **MongoDB Atlas** (or other cloud MongoDB) connection string. `localhost` will NOT work on Vercel — there is no persistent local Mongo instance there. |
| `DB_NAME` | Yes | Any database name, e.g. `sportvision_prod`. |
| `NEXT_PUBLIC_BASE_URL` | Yes | Your Vercel deployment URL, e.g. `https://your-app.vercel.app`. |
| `CORS_ORIGINS` | Optional | Defaults to `*`. Set to your domain for stricter CORS if desired. |

**No Gemini API key env var is needed.** This app is BYOK (Bring Your Own Key) — each visitor
enters their own Gemini API key in the browser (BYOK vault), and it's sent per-request via the
`x-gemini-api-key` header. It is never stored server-side or in any env var.

## 2. Deploy

1. Push this repo to GitHub/GitLab/Bitbucket.
2. Import the repo in Vercel ("Add New Project").
3. Vercel auto-detects Next.js — no build command changes needed (`next build` / `next start`).
4. Add the environment variables above, then deploy.

## 3. ⚠️ Important known limitation: video upload size on Vercel

The video analysis endpoint (`POST /api/analysis/start`) receives the uploaded video as a
`multipart/form-data` request body directly in a Next.js Route Handler. **Vercel Serverless
Functions have a hard 4.5 MB request body limit** — any request body larger than that returns
`413 FUNCTION_PAYLOAD_TOO_LARGE` before your code even runs. This is a Vercel platform limit, not
something configurable in Next.js route handlers.

- In this development sandbox (not Vercel), uploads up to 150MB work fine.
- On a real Vercel deployment, **only videos under ~4MB will currently work**.

**Recommended follow-up for production-grade Vercel deployments:** move the video upload off the
Vercel Function path entirely using **Vercel Blob client uploads** (`@vercel/blob/client`) — the
browser uploads the video bytes directly to Blob storage, and your API route only receives a small
JSON payload (the resulting Blob URL) to pass along to Gemini's Files API. This avoids the 4.5MB
limit completely. This has intentionally not been implemented yet — ask to add it if you plan to
support real-size sports videos (tens of MB) on a Vercel deployment.

## 4. Function duration

The analysis route already sets `export const maxDuration = 120` (seconds), which Vercel reads
automatically from the route segment config. Note: the **Hobby plan caps functions at 60s
regardless of this setting** — upgrade to a Pro plan for the full 120s of headroom for longer
Gemini video analyses.

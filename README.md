# CodeGuru

## Vercel deployment (existing production branch)

Import `ABPAVANKUMAR/CODEGURU` into Vercel and select branch `feat/universal-codeguru-platform`. The repository includes `vercel.json`; Vercel should detect the Vite frontend, run `npm install` and `npm run build`, and serve the `dist` output. The catch-all serverless handler at `api/[...route].js` forwards API requests to the existing Express app without starting a permanent listener.

Set server-only environment variables in the Vercel project settings (Production and Preview as appropriate):

- `GEMINI_API_KEY` and optional `GEMINI_MODEL` for Gemini endpoints.
- `JUDGE0_URL` and optional `JUDGE0_AUTH_TOKEN` (or `JUDGE0_API_KEY`) for Judge0 CE execution.
- `JUDGE0_POLL_TIMEOUT_MS` controls bounded Judge0 polling.
- `CORS_ORIGIN` is only needed for cross-origin frontend/API use; for same-origin Vercel traffic, leave it unset. If set, provide comma-separated allowed origins.
- `NODE_ENV` is supplied by Vercel; set only if needed for local development.

Do not use `VITE_` variables for secrets. Do not commit `.env` or credentials. `JUDGE0_URL` must be HTTPS except for localhost testing. Vercel Functions have a maximum duration; configure the Judge0 polling interval to fit your account's function limit.

## Local development and tests

Requirements: Node.js 18+ and npm.

```bash
npm install
cp .env.example .env
npm test
npm run build
npm run dev
```

Open <http://localhost:5173>. API health: <http://localhost:3001/api/health>. PowerShell: `Copy-Item .env.example .env`.

Execution and AI APIs return explicit configuration/provider errors when credentials or services are unavailable; they never fabricate code output. Static visualization is labeled as an approximation. Judge0 does not provide line-by-line execution tracing through this integration.

# CodeGuru

A universal AI programming workspace prototype with a Monaco editor and a small Express API.

## Run locally

Requirements: Node.js 18+ and npm.

```bash
npm install
cp .env.example .env
npm run dev
```

Open <http://localhost:5173>. The API health check is at <http://localhost:3001/api/health>.

On Windows PowerShell, use `Copy-Item .env.example .env` instead of `cp`.

## Current limitations

The API deliberately does **not** execute submitted code in the application server. Execution returns an explicit `static-analysis-only` status until an isolated execution provider is configured. Gemini conversion is also not wired yet; a key alone will not enable conversion until the server integration exists. Static analysis and explanations are best-effort and are not actual runtime traces.

Do not deploy code execution for untrusted submissions without a separate sandbox, resource limits, and appropriate network/filesystem isolation.

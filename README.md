# CodeGuru

CodeGuru is a multi-language programming workspace with a Monaco editor, real Judge0 CE execution integration, static source visualization, and optional Gemini-powered code conversion, explanation, and review.

## Run locally

Requirements: Node.js 18+ and npm.

```bash
npm install
cp .env.example .env
npm test
npm run build
npm run dev
```

Open <http://localhost:5173>. API health: <http://localhost:3001/api/health>.
On Windows PowerShell, use `Copy-Item .env.example .env` instead of `cp`.

## Providers (free/open source; limits apply)

- **Judge0 CE:** set `JUDGE0_URL` to your own Judge0 CE endpoint or an eligible CE endpoint, and optionally set `JUDGE0_AUTH_TOKEN`. The UI language list is fetched from the configured provider, so its available runtimes are authoritative. Provider quota, availability, and terms vary; this project does not guarantee a hosted free tier. Judge0 execution uses bounded CPU/wall time and memory settings. Code is sent to the configured third-party endpoint.
- **Gemini:** set `GEMINI_API_KEY` on the backend and optionally `GEMINI_MODEL`. API access and quotas depend on Google's current terms. Keys are never sent to the browser.

`.env.example` is a template, not a credential. Do not commit real keys.

## Execution and visualization truthfulness

Without Judge0 configuration, execution returns an explicit configuration error and never fabricates output. Actual execution reports stdout, stderr, compilation output, exit code, timing, memory, provider status, and supplied stdin when available. The Judge0 API does not provide a line-by-line debugger trace; CodeGuru labels its source-derived timeline, variable values, and memory views as static approximations, not runtime observations.

AI tasks return HTTP 503 when Gemini is not configured. They do not silently claim to be AI. Review/explanation/conversion responses are model-generated and should be checked. CodeGuru does not execute submitted code on its own application server.

## Security and deployment

Keep the API private or behind authentication/rate limiting for public deployment. Judge0 is the isolated execution provider, but submissions are still untrusted and are sent to that provider. Configure provider limits and credentials according to its deployment guidance. Never put provider credentials in frontend variables.

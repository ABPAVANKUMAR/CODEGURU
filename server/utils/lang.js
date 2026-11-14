# CodeGuru

CodeGuru is a universal AI-powered programming platform that supports writing, conversion, execution, visualization, explanation, and review across multiple programming languages.

## Features

- Monaco-based universal code editor with multi-file support
- Multi-language detection and switching
- Code execution for supported runtimes with timeout protection
- Static analysis + runtime output display
- AI conversion and review flows with safe fallback heuristics
- Visualization panels for execution flow and memory concepts
- Learning-focused UI for beginners and advanced developers

## Run locally

```bash
npm install
cp .env.example .env
npm run dev
```

Then open the Vite app at `http://localhost:5173`.

## Environment

- `GEMINI_API_KEY` optional; if present, backend AI responses use Gemini.
- Otherwise the system falls back to local heuristic analysis.

## Notes

This project is designed to run as a secure web app and uses local sandboxed execution for commonly available interpreters and compilers. Untrusted code should never be run on a production server without a managed isolated sandbox.

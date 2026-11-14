import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
const port = Number(process.env.PORT) || 3001;
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const badRequest = (res, message) => res.status(400).json({ error: message });
const validCode = (req, res) => {
  const code = req.body?.code;
  if (typeof code !== 'string' || code.length === 0) {
    badRequest(res, 'Provide non-empty code.');
    return null;
  }
  if (code.length > 50000) {
    badRequest(res, 'Code exceeds the 50 KB request limit.');
    return null;
  }
  return code;
};

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'CodeGuru API' }));
app.post('/api/analyze', (req, res) => {
  const code = validCode(req, res);
  if (!code) return;
  const language = req.body.language || 'unknown';
  const panels = [];
  if (/\[.*\]/s.test(code)) panels.push('Array visualization');
  if (/\b(for|while)\b/.test(code)) panels.push('Control flow');
  if (/\bfunction\b|\bdef\b|=>/.test(code)) panels.push('Function calls');
  if (/\*\s*[A-Za-z_]|&\s*[A-Za-z_]/.test(code)) panels.push('Pointer concepts (static guess)');
  if (/\bSELECT\b/i.test(code)) panels.push('SQL query explanation');
  res.json({ language, mode: 'static-analysis', summary: `Static inspection of ${language} source. This does not trace actual runtime execution.`, warnings: [], panels: panels.length ? panels : ['Execution structure'], variables: [], details: ['Static analysis is approximate; no runtime trace was collected.'] });
});
app.post('/api/execute', (req, res) => {
  if (!validCode(req, res)) return;
  res.json({ status: 'static-analysis-only', output: '', stderr: 'No isolated execution provider is configured. CodeGuru will not run submitted code directly inside the application server.', exitCode: null, executionTimeMs: 0, input: typeof req.body.input === 'string' ? req.body.input : '', message: 'Configure an isolated execution service (for example, a containerized runner) before enabling execution.' });
});
app.post('/api/review', (req, res) => {
  const code = validCode(req, res);
  if (!code) return;
  res.json({ summary: 'Heuristic static review only; it cannot establish runtime behavior.', qualityScore: null, issues: /\beval\s*\(/i.test(code) ? [{ title: 'Dynamic evaluation', severity: 'high', line: 1, explanation: 'Dynamic evaluation can execute data as code; validate the use and inputs.', whyItMatters: 'It can complicate security review.', suggestedCorrection: 'Prefer explicit parsing or safer APIs.' }] : [] });
});
app.post('/api/explain', (req, res) => {
  const code = validCode(req, res);
  if (!code) return;
  res.json({ overview: `Static, best-effort explanation for ${req.body.language || 'the selected language'}.`, steps: code.split('\n').filter((line) => line.trim()).slice(0, 20).map((line, index) => `Line ${index + 1}: ${line.trim()}`) });
});
app.post('/api/convert', (req, res) => {
  if (!validCode(req, res)) return;
  res.status(503).json({ error: 'AI conversion is not configured. Set GEMINI_API_KEY and add the AI provider integration before requesting conversion.' });
});

app.listen(port, () => console.log(`CodeGuru API listening at http://localhost:${port}`));

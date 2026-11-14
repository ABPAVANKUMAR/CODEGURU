import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { executeCode } from './utils/executor.js';
import { detectLanguage } from './utils/lang.js';
import { generateAnalysis, generateReview, generateExplanation, convertCode } from './utils/ai.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (_, res) => {
  res.json({ ok: true, status: 'healthy' });
});

app.post('/api/analyze', async (req, res) => {
  const { code = '', language = 'auto', fileName = 'main.py' } = req.body || {};
  const result = await generateAnalysis({ code, language, fileName });
  res.json(result);
});

app.post('/api/execute', async (req, res) => {
  const { code = '', language = 'auto', input = '', fileName = 'main.py' } = req.body || {};
  const targetLanguage = language && language !== 'auto' ? language : detectLanguage(code, fileName);
  const result = await executeCode({ code, language: targetLanguage, input, fileName });
  res.json(result);
});

app.post('/api/review', async (req, res) => {
  const { code = '', language = 'python' } = req.body || {};
  const result = await generateReview({ code, language });
  res.json(result);
});

app.post('/api/explain', async (req, res) => {
  const { code = '', language = 'python' } = req.body || {};
  const result = await generateExplanation({ code, language });
  res.json(result);
});

app.post('/api/convert', async (req, res) => {
  const { code = '', sourceLanguage = 'python', targetLanguage = 'javascript' } = req.body || {};
  const result = await convertCode({ code, sourceLanguage, targetLanguage });
  res.json(result);
});

app.listen(PORT, () => {
  console.log(`CodeGuru backend running on http://localhost:${PORT}`);
});

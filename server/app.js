import express from 'express';
import cors from 'cors';
import { analyzeSource } from './utils/analysis.js';
import { runGeminiTask } from './utils/gemini.js';
import { executeOnJudge0, getJudge0Languages, isJudge0Configured } from './utils/judge0.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');

  const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.use(cors({
    origin(origin, callback) {
      // Same-origin requests generally omit Origin. Allow local clients and explicitly configured origins.
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Origin is not allowed by CodeGuru CORS configuration.'));
    },
  }));
  app.use(express.json({ limit: '256kb' }));

  function codeFrom(req, res) {
    const code = req.body?.code;
    if (typeof code !== 'string' || !code.trim()) {
      res.status(400).json({ error: 'Provide non-empty code.' });
      return null;
    }
    if (Buffer.byteLength(code, 'utf8') > 50_000) {
      res.status(413).json({ error: 'Code exceeds the 50 KB request limit.' });
      return null;
    }
    return code;
  }

  app.get(['/api/health', '/health'], (_req, res) => res.json({
    ok: true,
    service: 'CodeGuru API',
    providers: { execution: isJudge0Configured(), ai: Boolean(process.env.GEMINI_API_KEY) },
  }));

  app.get(['/api/languages', '/languages'], async (_req, res) => {
    try {
      const languages = await getJudge0Languages();
      res.json({ configured: isJudge0Configured(), provider: 'Judge0 CE', languages });
    } catch (error) {
      res.status(error.statusCode || 502).json({ error: error.message, configured: isJudge0Configured(), languages: [] });
    }
  });

  app.post(['/api/analyze', '/analyze'], (req, res) => {
    const code = codeFrom(req, res);
    if (code === null) return;
    res.json(analyzeSource(code, req.body.language || 'unknown'));
  });

  app.post(['/api/execute', '/execute'], async (req, res) => {
    const code = codeFrom(req, res);
    if (code === null) return;
    const input = req.body.input ?? '';
    if (typeof input !== 'string' || Buffer.byteLength(input, 'utf8') > 20_000) {
      res.status(400).json({ error: 'Standard input must be text no larger than 20 KB.' });
      return;
    }
    try {
      const result = await executeOnJudge0({ code, language: req.body.language || '', languageId: req.body.languageId, stdin: input, fileName: req.body.fileName || 'main' });
      res.status(result.providerError ? 502 : 200).json(result);
    } catch (error) {
      res.status(error.statusCode || 502).json({ error: error.message, provider: 'Judge0 CE' });
    }
  });

  app.post(['/api/review', '/review'], async (req, res) => {
    const code = codeFrom(req, res);
    if (code === null) return;
    try { res.json(await runGeminiTask('review', { code, language: req.body.language || 'unknown' })); }
    catch (error) { res.status(error.statusCode || 502).json({ error: error.message, provider: 'Gemini' }); }
  });

  app.post(['/api/explain', '/explain'], async (req, res) => {
    const code = codeFrom(req, res);
    if (code === null) return;
    try { res.json(await runGeminiTask('explain', { code, language: req.body.language || 'unknown', question: req.body.question || '' })); }
    catch (error) { res.status(error.statusCode || 502).json({ error: error.message, provider: 'Gemini' }); }
  });

  app.post(['/api/convert', '/convert'], async (req, res) => {
    const code = codeFrom(req, res);
    if (code === null) return;
    const { sourceLanguage, targetLanguage } = req.body;
    if (typeof sourceLanguage !== 'string' || typeof targetLanguage !== 'string' || !targetLanguage.trim()) {
      res.status(400).json({ error: 'Provide sourceLanguage and targetLanguage.' });
      return;
    }
    try { res.json(await runGeminiTask('convert', { code, sourceLanguage, targetLanguage })); }
    catch (error) { res.status(error.statusCode || 502).json({ error: error.message, provider: 'Gemini' }); }
  });

  app.use((error, _req, res, _next) => {
    if (error?.type === 'entity.too.large') return res.status(413).json({ error: 'Request body is too large.' });
    if (error instanceof SyntaxError) return res.status(400).json({ error: 'Request body must be valid JSON.' });
    if (error?.message?.includes('CORS')) return res.status(403).json({ error: error.message });
    console.error('CodeGuru API error:', error);
    return res.status(500).json({ error: 'Unexpected server error.' });
  });

  return app;
}

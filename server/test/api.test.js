import { createApp } from '../app.js';
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';

let server;
let base;
before(async () => {
  server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => new Promise((resolve) => server.close(resolve)));

 test('health describes missing providers honestly', async () => {
  const response = await fetch(`${base}/api/health`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(typeof body.providers.execution, 'boolean');
});

test('analyze marks visualizations as static approximations', async () => {
  const response = await fetch(`${base}/api/analyze`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: 'const items = [1, 2];\nfor (const item of items) {}', language: 'javascript' }) });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.mode, 'static-analysis');
  assert.equal(body.visualization.mode, 'static-approximation');
  assert.ok(body.panels.some((panel) => panel.includes('Array')));
  assert.ok(body.steps.length > 0);
});

test('execution refuses to fabricate output without Judge0 configuration', async () => {
  const previous = process.env.JUDGE0_URL;
  delete process.env.JUDGE0_URL;
  const response = await fetch(`${base}/api/execute`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: 'print(1)', language: 'python' }) });
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /JUDGE0_URL/);
  if (previous !== undefined) process.env.JUDGE0_URL = previous;
});

test('rejects empty or oversized code', async () => {
  const empty = await fetch(`${base}/api/analyze`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: '' }) });
  assert.equal(empty.status, 400);
  const large = await fetch(`${base}/api/analyze`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: 'x'.repeat(50_001) }) });
  assert.equal(large.status, 413);
});

test('AI endpoints report missing Gemini configuration instead of fabricated AI', async () => {
  const previous = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  const response = await fetch(`${base}/api/explain`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: 'print(1)', language: 'python' }) });
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /GEMINI_API_KEY/);
  if (previous !== undefined) process.env.GEMINI_API_KEY = previous;
});

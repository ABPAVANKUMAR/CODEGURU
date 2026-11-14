const MAX_POLL_MS = Math.min(Math.max(Number(process.env.JUDGE0_POLL_TIMEOUT_MS) || 20_000, 1_000), 45_000);
const MAX_OUTPUT = 128_000;
let languageCache = { expiresAt: 0, languages: [] };

export function isJudge0Configured() {
  return Boolean(process.env.JUDGE0_URL);
}

function baseUrl() {
  const value = process.env.JUDGE0_URL;
  if (!value) {
    const error = new Error('Execution is not configured. Set JUDGE0_URL to a Judge0 CE endpoint.');
    error.statusCode = 503;
    throw error;
  }
  let parsed;
  try { parsed = new URL(value); } catch {
    const error = new Error('JUDGE0_URL must be a valid HTTPS URL.'); error.statusCode = 500; throw error;
  }
  const local = ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname);
  if (parsed.protocol !== 'https:' && !(local && parsed.protocol === 'http:')) {
    const error = new Error('JUDGE0_URL must use HTTPS except for localhost testing.'); error.statusCode = 500; throw error;
  }
  return parsed.toString().replace(/\/$/, '');
}

function authHeaders(json = false) {
  const headers = { Accept: 'application/json' };
  if (json) headers['Content-Type'] = 'application/json';
  if (process.env.JUDGE0_AUTH_TOKEN) headers['X-Auth-Token'] = process.env.JUDGE0_AUTH_TOKEN;
  return headers;
}

async function providerFetch(url, options = {}, timeoutMs = 8_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal, redirect: 'error' });
  } catch (error) {
    const err = new Error(error.name === 'AbortError' ? 'Judge0 request timed out.' : `Unable to reach Judge0: ${error.message}`);
    err.statusCode = 502;
    throw err;
  } finally { clearTimeout(timeout); }
}

export async function getJudge0Languages({ force = false } = {}) {
  if (!isJudge0Configured()) return [];
  if (!force && languageCache.expiresAt > Date.now()) return languageCache.languages;
  const response = await providerFetch(`${baseUrl()}/languages`, { headers: authHeaders() });
  if (!response.ok) throw new Error(`Judge0 language list returned HTTP ${response.status}.`);
  const payload = await response.json();
  if (!Array.isArray(payload)) throw new Error('Judge0 returned an invalid language list.');
  languageCache = {
    expiresAt: Date.now() + 5 * 60_000,
    languages: payload.map(({ id, name, is_archived }) => ({ id, name, archived: Boolean(is_archived) })).filter((lang) => Number.isInteger(lang.id) && lang.name && !lang.archived),
  };
  return languageCache.languages;
}

function normalize(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9+#]/g, '');
}

function findLanguage(languages, name) {
  const target = normalize(name);
  const aliases = {
    csharp: ['csharp', 'c#'], cpp: ['cpp', 'c++', 'gnu g++'], javascript: ['javascript', 'node.js'],
    typescript: ['typescript'], python: ['python', 'python3'], bash: ['bash'],
  };
  const candidates = aliases[target] || [target];
  return languages.find((item) => candidates.some((candidate) => normalize(item.name).includes(normalize(candidate))));
}

function decodeBase64(value) {
  if (!value) return '';
  try { return Buffer.from(value, 'base64').toString('utf8').slice(0, MAX_OUTPUT); } catch { return ''; }
}

function mapResult(result, input, languageName) {
  const statusId = result.status?.id;
  const statusDescription = result.status?.description || 'Unknown';
  const pending = statusId === 1 || statusId === 2;
  return {
    provider: 'Judge0 CE',
    mode: 'actual-execution',
    status: pending ? 'processing' : statusDescription.toLowerCase().replaceAll(' ', '-'),
    statusDescription,
    language: languageName,
    output: decodeBase64(result.stdout),
    stderr: decodeBase64(result.stderr),
    compilationOutput: decodeBase64(result.compile_output),
    message: decodeBase64(result.message),
    exitCode: result.exit_code ?? null,
    executionTimeSeconds: result.time ?? null,
    executionTimeMs: result.time == null ? null : Math.round(Number(result.time) * 1000),
    memoryKb: result.memory ?? null,
    input,
    trace: { available: false, label: 'Runtime tracing is not provided by this Judge0 execution.' },
  };
}

export async function executeOnJudge0({ code, language, languageId, stdin = '', fileName = 'main' }) {
  const endpoint = baseUrl();
  const languages = await getJudge0Languages();
  if (!languages.length) {
    const error = new Error('Judge0 did not return any configured languages. Check the endpoint and authentication.'); error.statusCode = 503; throw error;
  }
  let selected = Number.isInteger(Number(languageId)) ? languages.find((item) => item.id === Number(languageId)) : null;
  if (!selected) selected = findLanguage(languages, language);
  if (!selected) {
    return {
      provider: 'Judge0 CE', mode: 'static-analysis-only', status: 'unsupported-language', output: '', stderr: '',
      compilationOutput: '', exitCode: null, executionTimeMs: null, input: stdin,
      message: `“${language}” is not available in the configured Judge0 language list. No execution was attempted.`,
      availableLanguages: languages.map((item) => item.name),
    };
  }

  const query = new URLSearchParams({ base64_encoded: 'true', wait: 'false' });
  const submission = {
    source_code: Buffer.from(code, 'utf8').toString('base64'),
    language_id: selected.id,
    stdin: Buffer.from(stdin, 'utf8').toString('base64'),
    cpu_time_limit: 2,
    wall_time_limit: 5,
    memory_limit: 128_000,
  };
  if (fileName && /^[\w.-]{1,80}$/.test(fileName)) submission.additional_files = undefined;
  const response = await providerFetch(`${endpoint}/submissions?${query}`, {
    method: 'POST', headers: authHeaders(true), body: JSON.stringify(submission),
  }, 10_000);
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    const error = new Error(`Judge0 submission failed (HTTP ${response.status}): ${detail || response.statusText}`); error.statusCode = 502; throw error;
  }
  const { token } = await response.json();
  if (!token || typeof token !== 'string') throw new Error('Judge0 did not return a submission token.');

  const started = Date.now();
  while (Date.now() - started < MAX_POLL_MS) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    const pollQuery = new URLSearchParams({ base64_encoded: 'true', fields: 'stdout,stderr,compile_output,message,status,exit_code,time,memory' });
    const polled = await providerFetch(`${endpoint}/submissions/${encodeURIComponent(token)}?${pollQuery}`, { headers: authHeaders() }, 8_000);
    if (!polled.ok) {
      const error = new Error(`Judge0 result polling failed (HTTP ${polled.status}).`); error.statusCode = 502; throw error;
    }
    const result = await polled.json();
    if (result.status?.id !== 1 && result.status?.id !== 2) return mapResult(result, stdin, selected.name);
  }

  return {
    provider: 'Judge0 CE', mode: 'actual-execution', status: 'processing', statusDescription: 'Still processing',
    output: '', stderr: '', compilationOutput: '', exitCode: null, executionTimeMs: null, input: stdin,
    message: `Judge0 accepted this run, but it did not finish within ${MAX_POLL_MS} ms. No output is reported yet.`,
    trace: { available: false, label: 'Runtime tracing is not provided by this Judge0 execution.' },
  };
}

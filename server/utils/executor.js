import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { getRuntimeSupport } from './lang.js';

export async function executeCode({ code = '', language = 'python', input = '', fileName = 'main.py' }) {
  const normalizedLanguage = (language || '').toLowerCase();
  const runtime = getRuntimeSupport(normalizedLanguage);

  if (!runtime.supported) {
    return {
      status: 'static-analysis-only',
      output: '',
      stderr: `Execution for ${normalizedLanguage || 'this language'} is not supported in this environment.`,
      executionTimeMs: 0,
      exitCode: 0,
      input,
      runtimeErrors: [],
      compilationErrors: ['Static analysis mode only: runtime unavailable.'],
    };
  }

  const workingDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codeguru-'));
  const tempFile = path.join(workingDir, fileName || `main${getExtension(normalizedLanguage)}`);
  fs.writeFileSync(tempFile, code, 'utf8');

  try {
    if (normalizedLanguage === 'python') return runCommandSafe('python3', [tempFile], input);
    if (normalizedLanguage === 'javascript') return runCommandSafe('node', [tempFile], input);
    if (normalizedLanguage === 'bash') return runCommandSafe('bash', [tempFile], input);
    if (normalizedLanguage === 'c') return runCompiledProgram('gcc', [tempFile, '-o', path.join(workingDir, 'program')], path.join(workingDir, 'program'), input);
    if (normalizedLanguage === 'cpp') return runCompiledProgram('g++', [tempFile, '-o', path.join(workingDir, 'program')], path.join(workingDir, 'program'), input);
    if (normalizedLanguage === 'java') return runJavaProgram(tempFile, input);
    if (normalizedLanguage === 'go') return runCommandSafe('go', ['run', tempFile], input);
    if (normalizedLanguage === 'rust') return runCompiledProgram('rustc', [tempFile, '-o', path.join(workingDir, 'program')], path.join(workingDir, 'program'), input);
    if (normalizedLanguage === 'php') return runCommandSafe('php', [tempFile], input);
    if (normalizedLanguage === 'ruby') return runCommandSafe('ruby', [tempFile], input);

    return {
      status: 'static-analysis-only',
      output: '',
      stderr: `This language is known but no secure runner is configured for ${normalizedLanguage}.`,
      executionTimeMs: 0,
      exitCode: 0,
      input,
      runtimeErrors: [],
      compilationErrors: ['Static analysis only.'],
    };
  } finally {
    fs.rmSync(workingDir, { recursive: true, force: true });
  }
}

function getExtension(language) {
  const map = {
    python: '.py',
    javascript: '.js',
    bash: '.sh',
    c: '.c',
    cpp: '.cpp',
    java: '.java',
    go: '.go',
    rust: '.rs',
    php: '.php',
    ruby: '.rb',
  };
  return map[language] || '.txt';
}

function runCommandSafe(command, args, input) {
  return new Promise((resolve) => {
    const start = Date.now();
    let stdout = '';
    let stderr = '';
    const child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'] });

    const timeout = setTimeout(() => {
      child.kill('SIGKILL');
      resolve({
        status: 'timed-out',
        output: stdout,
        stderr: 'Execution timed out after the configured timeout.',
        exitCode: 124,
        executionTimeMs: Date.now() - start,
        input,
        runtimeErrors: ['Execution timed out.'],
        compilationErrors: [],
      });
    }, 5000);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      clearTimeout(timeout);
      resolve({
        status: 'error',
        output: stdout,
        stderr: `${error.message}\n${stderr}`,
        exitCode: 1,
        executionTimeMs: Date.now() - start,
        input,
        runtimeErrors: [error.message],
        compilationErrors: [stderr || error.message],
      });
    });

    child.on('close', (code) => {
      clearTimeout(timeout);
      resolve({
        status: code === 0 ? 'success' : 'failed',
        output: stdout,
        stderr,
        exitCode: code ?? 0,
        executionTimeMs: Date.now() - start,
        input,
        runtimeErrors: code === 0 ? [] : [stderr || 'Runtime error'],
        compilationErrors: stderr ? [stderr] : [],
      });
    });

    if (input) {
      child.stdin.write(input);
    }
    child.stdin.end();
  });
}

async function runCompiledProgram(compiler, compileArgs, outputPath, input) {
  const compileResult = await runCommandSafe(compiler, compileArgs, '');
  if (compileResult.exitCode !== 0) {
    return { ...compileResult, status: 'compile-error', input, runtimeErrors: compileResult.runtimeErrors || [], compilationErrors: compileResult.stderr ? [compileResult.stderr] : [] };
  }

  return runCommandSafe(outputPath, [], input);
}

async function runJavaProgram(filePath, input) {
  const dir = path.dirname(filePath);
  const className = path.basename(filePath, '.java');
  const compileResult = await runCommandSafe('javac', [filePath], '');
  if (compileResult.exitCode !== 0) {
    return { ...compileResult, status: 'compile-error', input, runtimeErrors: compileResult.runtimeErrors || [], compilationErrors: compileResult.stderr ? [compileResult.stderr] : [] };
  }

  return runCommandSafe('java', ['-cp', dir, className], input);
}

export default executeCode;
















































































































































































































































































































































































































































































































































































































































\n
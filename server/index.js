import { execFile, spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { promisify } from 'util';
import { getRuntimeSupport } from './lang.js';

const execFileAsync = promisify(execFile);

export async function executeCode({ code, language, input = '', fileName = 'main' }) {
  const languageKey = (language || '').toLowerCase();
  const runtime = getRuntimeSupport(languageKey);

  if (!runtime.supported) {
    return {
      status: 'static-analysis-only',
      output: '',
      stderr: `Execution for ${languageKey || 'this language'} is not supported in this environment.`,
      executionTimeMs: 0,
      exitCode: 0,
      input,
      runtimeErrors: [],
      compilationErrors: ['Static analysis only: runtime unavailable.'],
    };
  }

  const workingDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codeguru-'));
  const tempFile = path.join(workingDir, fileName || `main${getExtension(languageKey)}`);
  fs.writeFileSync(tempFile, code, 'utf8');

  try {
    if (languageKey === 'python') {
      return await runPython(tempFile, input, workingDir);
    }
    if (languageKey === 'javascript') {
      return await runNodeFile(tempFile, input, workingDir);
    }
    if (languageKey === 'bash') {
      return await runBash(tempFile, input, workingDir);
    }
    if (languageKey === 'c') {
      return await runCFile(tempFile, input, workingDir);
    }
    if (languageKey === 'cpp') {
      return await runCppFile(tempFile, input, workingDir);
    }
    if (languageKey === 'java') {
      return await runJavaFile(tempFile, input, workingDir);
    }
    if (languageKey === 'go') {
      return await runGoFile(tempFile, input, workingDir);
    }
    if (languageKey === 'rust') {
      return await runRustFile(tempFile, input, workingDir);
    }
    if (languageKey === 'php') {
      return await runPhpFile(tempFile, input, workingDir);
    }
    if (languageKey === 'ruby') {
      return await runRubyFile(tempFile, input, workingDir);
    }

    return {
      status: 'static-analysis-only',
      output: '',
      stderr: `This runtime is recognized, but no secure runner has been configured for ${languageKey}.`,
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

function getRuntimeCommand(command, args) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    let stdout = '';
    let stderr = '';
    const child = spawn(command, args, { shell: false, stdio: ['pipe', 'pipe', 'pipe'] });

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      resolve({
        status: 'error',
        output: stdout,
        stderr: `${error.message}\n${stderr}`,
        exitCode: 1,
        executionTimeMs: Date.now() - startedAt,
        runtimeErrors: [error.message],
        compilationErrors: stderr ? [stderr] : [],
      });
    });

    child.on('close', (code) => {
      resolve({
        status: code === 0 ? 'success' : 'failed',
        output: stdout,
        stderr,
        exitCode: code ?? 0,
        executionTimeMs: Date.now() - startedAt,
        runtimeErrors: code === 0 ? [] : [stderr || 'Runtime error'],
        compilationErrors: stderr ? [stderr] : [],
      });
    });

    setTimeout(() => {
      child.kill('SIGKILL');
      resolve({
        status: 'timed-out',
        output: stdout,
        stderr: 'Execution timed out after the configured timeout.',
        exitCode: 124,
        executionTimeMs: Date.now() - startedAt,
        runtimeErrors: ['Execution timed out.'],
        compilationErrors: [],
      });
    }, 5000);
  });
}

async function runPython(filePath, input, workingDir) {
  try {
    const result = await getRuntimeCommand('python3', [filePath]);
    return { ...result, input };
  } catch (error) {
    return { status: 'error', output: '', stderr: error.message, executionTimeMs: 0, exitCode: 1, input, runtimeErrors: [error.message], compilationErrors: [error.message] };
  }
}

async function runNodeFile(filePath, input, workingDir) {
  const result = await getRuntimeCommand('node', [filePath]);
  return { ...result, input };
}

async function runBash(filePath, input, workingDir) {
  const result = await getRuntimeCommand('bash', [filePath]);
  return { ...result, input };
}

async function runCFile(filePath, input, workingDir) {
  const outputPath = path.join(workingDir, 'program');
  const compile = await getRuntimeCommand('gcc', [filePath, '-o', outputPath]);
  if (compile.exitCode !== 0) return { ...compile, input, status: 'compile-error' };
  const run = await getRuntimeCommand(outputPath);
  return { ...run, input };
}

async function runCppFile(filePath, input, workingDir) {
  const outputPath = path.join(workingDir, 'program');
  const compile = await getRuntimeCommand('g++', [filePath, '-o', outputPath]);
  if (compile.exitCode !== 0) return { ...compile, input, status: 'compile-error' };
  const run = await getRuntimeCommand(outputPath);
  return { ...run, input };
}

async function runJavaFile(filePath, input, workingDir) {
  const dir = path.dirname(filePath);
  const base = path.basename(filePath, '.java');
  const compile = await getRuntimeCommand('javac', [filePath]);
  if (compile.exitCode !== 0) return { ...compile, input, status: 'compile-error' };
  const run = await getRuntimeCommand('java', ['-cp', dir, base]);
  return { ...run, input };
}

async function runGoFile(filePath, input, workingDir) {
  const result = await getRuntimeCommand('go', ['run', filePath]);
  return { ...result, input };
}

async function runRustFile(filePath, input, workingDir) {
  const outputPath = path.join(workingDir, 'rust_program');
  const compile = await getRuntimeCommand('rustc', [filePath, '-o', outputPath]);
  if (compile.exitCode !== 0) return { ...compile, input, status: 'compile-error' };
  const run = await getRuntimeCommand(outputPath);
  return { ...run, input };
}

async function runPhpFile(filePath, input, workingDir) {
  const result = await getRuntimeCommand('php', [filePath]);
  return { ...result, input };
}

async function runRubyFile(filePath, input, workingDir) {
  const result = await getRuntimeCommand('ruby', [filePath]);
  return { ...result, input };
}

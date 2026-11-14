export const languageCatalog = {
  python: { label: 'Python', extension: '.py', runners: ['python3', 'python'], preferred: 'python3' },
  javascript: { label: 'JavaScript', extension: '.js', runners: ['node'], preferred: 'node' },
  typescript: { label: 'TypeScript', extension: '.ts', runners: ['node'], preferred: 'node' },
  c: { label: 'C', extension: '.c', runners: ['gcc', 'clang'], preferred: 'gcc' },
  cpp: { label: 'C++', extension: '.cpp', runners: ['g++', 'clang++'], preferred: 'g++' },
  csharp: { label: 'C#', extension: '.cs', runners: ['dotnet'], preferred: 'dotnet' },
  go: { label: 'Go', extension: '.go', runners: ['go'], preferred: 'go' },
  rust: { label: 'Rust', extension: '.rs', runners: ['rustc'], preferred: 'rustc' },
  ruby: { label: 'Ruby', extension: '.rb', runners: ['ruby'], preferred: 'ruby' },
  php: { label: 'PHP', extension: '.php', runners: ['php'], preferred: 'php' },
  java: { label: 'Java', extension: '.java', runners: ['javac', 'java'], preferred: 'javac' },
  bash: { label: 'Bash', extension: '.sh', runners: ['bash'], preferred: 'bash' },
  html: { label: 'HTML', extension: '.html', runners: ['node'], preferred: 'node' },
  css: { label: 'CSS', extension: '.css', runners: ['node'], preferred: 'node' },
  sql: { label: 'SQL', extension: '.sql', runners: [], preferred: '' },
  json: { label: 'JSON', extension: '.json', runners: [], preferred: '' },
  yaml: { label: 'YAML', extension: '.yaml', runners: [], preferred: '' },
  xml: { label: 'XML', extension: '.xml', runners: [], preferred: '' },
  powershell: { label: 'PowerShell', extension: '.ps1', runners: ['pwsh'], preferred: 'pwsh' },
  swift: { label: 'Swift', extension: '.swift', runners: ['swift'], preferred: 'swift' },
  kotlin: { label: 'Kotlin', extension: '.kt', runners: ['kotlinc', 'kotlin'], preferred: 'kotlinc' },
  r: { label: 'R', extension: '.r', runners: ['Rscript'], preferred: 'Rscript' },
  dart: { label: 'Dart', extension: '.dart', runners: ['dart'], preferred: 'dart' },
  matlab: { label: 'MATLAB', extension: '.m', runners: [], preferred: '' },
};

export function detectLanguage(code = '', fileName = '') {
  const lower = code.toLowerCase();
  const fileExt = (fileName.split('.').pop() || '').toLowerCase();

  if (fileExt && languageCatalog[fileExt]) {
    return fileExt;
  }

  if (/<html|<!doctype html/i.test(code)) return 'html';
  if (/\bprint\s*\(|def\s+\w+\s*\(/.test(code)) return 'python';
  if (/const\s+\w+|let\s+\w+|function\s+\w+/i.test(code) || /console\.log/.test(code)) return 'javascript';
  if (/class\s+\w+|public\s+static\s+void\s+main|System\.out\.println/.test(code)) return 'java';
  if (/#include\s*<|printf\s*\(/.test(code)) return 'c';
  if (/\busing\s+namespace|std::|cout\s*<</.test(code)) return 'cpp';
  if (/\bpackage\s+main|fmt\.Println/.test(code)) return 'go';
  if (/fn\s+main|println!\(/.test(code)) return 'rust';
  if (/SELECT\s+|INSERT\s+INTO|CREATE\s+TABLE/.test(code)) return 'sql';
  if (/^\s*#!/.*bash|echo\s+/.test(code)) return 'bash';
  if (/\bfunction\s+\w+\s*\(|var\s+\w+|console\.log/.test(code)) return 'javascript';
  if (/"\s*:\s*\{|\{\s*"/.test(code)) return 'json';

  return 'plaintext';
}

export function getRuntimeSupport(language) {
  const info = languageCatalog[language];
  if (!info) return { supported: false, reason: 'Language is not configured for execution in this environment.' };
  const runners = info.runners || [];
  return {
    supported: runners.length > 0,
    reason: runners.length ? 'Interpreter/compiler available or runtime configured.' : 'This runtime requires an external tool that is not installed or configured in this environment.',
  };
}

export function inferVariables(code) {
  const regex = /(?:const|let|var|int|float|double|char|bool|string|byte|long|short|List|Map|dict|array)\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?:=\s*([^;]+))?/g;
  const variables = [];
  let match;
  while ((match = regex.exec(code)) !== null) {
    variables.push({
      name: match[1],
      type: match[0].trim().split(/\s+/)[0],
      value: match[2] ? match[2].trim() : 'null',
      scope: 'local',
    });
  }
  return variables;
}

export function inferPanels(code) {
  const panels = [];
  if (/[\[\]]/.test(code)) panels.push('Array Visualization');
  if (/[A-Za-z_][A-Za-z0-9_]*\s*\(/.test(code)) panels.push('Function Call Stack');
  if (/if\s*\(|switch\s*\(|for\s*\(|while\s*\(/.test(code)) panels.push('Control Flow Timeline');
  if (/class\s+\w+|new\s+\w+/.test(code)) panels.push('Object Relationships');
  if (/->|\*\w+|&\w+/.test(code)) panels.push('Pointer Trace');
  if (/\b(SELECT|INSERT|UPDATE|DELETE)\b/.test(code)) panels.push('Query Execution');
  if (panels.length === 0) panels.push('Execution Timeline');
  return panels;
}

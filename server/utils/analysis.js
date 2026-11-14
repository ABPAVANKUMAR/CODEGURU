const defaultSteps = (code) => code.split('\n').map((text, index) => ({ line: index + 1, source: text, operation: text.trim() ? 'Statement (static approximation)' : 'Blank line', changes: [] })).filter((step) => step.source.trim()).slice(0, 100);

export function analyzeSource(code, language = 'unknown') {
  const variables = [];
  const steps = defaultSteps(code);
  const patterns = [
    { regex: /\b(?:const|let|var|int|float|double|char|bool|string|long|short)\s+([A-Za-z_$][\w$]*)\s*(?:=\s*([^;]+))?/, typeGroup: 0, nameGroup: 1, valueGroup: 2 },
    { regex: /^\s*([A-Za-z_]\w*)\s*=\s*(.+?)\s*$/, typeGroup: null, nameGroup: 1, valueGroup: 2 },
  ];
  for (const step of steps) {
    for (const pattern of patterns) {
      const match = step.source.match(pattern.regex);
      if (!match) continue;
      const name = match[pattern.nameGroup];
      const existing = variables.find((item) => item.name === name);
      const value = match[pattern.valueGroup]?.trim() || '(uninitialized / not inferred)';
      const type = pattern.typeGroup === null ? existing?.type || 'inferred' : match[0].trim().split(/\s+/)[0];
      const change = { name, type, before: existing?.value ?? null, after: value, scope: 'source-level inference' };
      if (existing) { existing.value = value; existing.type = type; }
      else variables.push({ name, type, value, scope: 'source-level inference', lifetime: 'not determined statically' });
      step.changes.push(change);
      step.operation = existing ? `Update ${name} (inferred)` : `Declare ${name} (inferred)`;
      break;
    }
  }

  const panels = [];
  if (/\[[^\]]*\]/s.test(code)) panels.push('Array / collection');
  if (/\b(?:for|while|do)\b/.test(code)) panels.push('Control flow / loops');
  if (/\b(?:def|function|fn)\b|\([^)]*\)\s*=>/.test(code)) panels.push('Function / call structure');
  if (/\b(?:class|new)\b/.test(code)) panels.push('Object relationships');
  if (/\*\s*[A-Za-z_]\w*|&\s*[A-Za-z_]\w*|\bmalloc\s*\(|\bnullptr\b/.test(code)) panels.push('Pointers / memory concepts');
  if (/\b(?:SELECT|INSERT|UPDATE|DELETE|CREATE\s+TABLE)\b/i.test(code)) panels.push('SQL query structure');
  if (/<\s*(?:html|body|div|main)\b/i.test(code)) panels.push('HTML structure / safe preview');
  if (panels.length === 0) panels.push('Source statement timeline');

  return {
    language,
    mode: 'static-analysis',
    summary: `Static inspection of ${language} source. This is a structural approximation; it is not an execution trace and does not establish runtime values.`,
    warnings: [],
    details: ['Values, scopes, data-structure operations, and memory relationships are inferred from source text only.', 'Use Judge0 output for actual program output. The configured Judge0 provider does not expose a step debugger.'],
    visualization: { mode: 'static-approximation', label: 'Static approximation — not an actual runtime trace', panels, steps, variables },
    panels,
    steps,
    variables,
    memory: { mode: 'static-approximation', stack: 'Not observable from static source analysis', heap: 'Not observable from static source analysis', pointers: /\*\s*[A-Za-z_]\w*|&\s*[A-Za-z_]\w*/.test(code) ? 'Pointer syntax detected; address values are not available statically.' : 'No pointer syntax detected.' },
  };
}

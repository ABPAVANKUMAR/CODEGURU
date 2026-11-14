import { detectLanguage, inferPanels, inferVariables } from './lang.js';

export async function generateAnalysis({ code, language, fileName }) {
  const detectedLanguage = language && language !== 'auto' ? language : detectLanguage(code, fileName || '');
  const variables = inferVariables(code);
  const panels = inferPanels(code);

  const summary = `Static analysis detected ${detectedLanguage} code and identified ${variables.length} likely variable declarations. The excerpt appears to use structured programming patterns with ${panels.join(', ')} relevant views.`;

  const warnings = [];
  if ((code.match(/eval\s*\(/gi) || []).length) warnings.push('Avoid using eval-like execution to reduce risk and debugging difficulty.');
  if ((code.match(/while\s*\(true\)/gi) || []).length) warnings.push('A true loop without a safe exit condition may risk non-terminating execution.');
  if (detectedLanguage === 'plaintext') warnings.push('Language detection is uncertain; static analysis is a best-effort approximation.');

  return {
    language: detectedLanguage,
    summary,
    warnings,
    details: [
      `Supportability: ${detectedLanguage} is available for static analysis and may be executable when the runtime is installed.`,
      'Execution timeline and variable tracking can be generated from the code structure.',
      'Use isolated runtime execution for untrusted code to avoid security issues.',
    ],
    visualization: {
      relevant: panels,
      panels,
      variables,
    },
    variables,
  };
}

export async function generateReview({ code, language }) {
  const issues = [];
  const lowerCode = code.toLowerCase();
  if (/print\s*\(|console\.log/.test(code)) {
    issues.push({
      title: 'Logging is present',
      severity: 'low',
      line: 1,
      explanation: 'This code emits output during execution.',
      whyItMatters: 'Helpful for debugging, but avoid noisy logs in production code.',
      suggestedCorrection: 'Use structured logging or guards for production environments.',
      correctedCode: code,
    });
  }

  if (/for\s*\([^)]*;[^)]*;[^)]*\)/.test(code) || /while\s*\(true\)/.test(code)) {
    issues.push({
      title: 'Looping logic should be reviewed',
      severity: 'medium',
      line: 1,
      explanation: 'The code contains a loop pattern that may need an exit condition or bound.',
      whyItMatters: 'Infinite loops can block execution and consume resources.',
      suggestedCorrection: 'Add a clear termination condition and test with representative input.',
      correctedCode: code,
    });
  }

  if (lowerCode.includes('eval') || lowerCode.includes('exec')) {
    issues.push({
      title: 'Command execution or dynamic evaluation',
      severity: 'high',
      line: 1,
      explanation: 'Dynamic code execution can be dangerous and difficult to audit.',
      whyItMatters: 'It increases the risk of code injection and unpredictable runtime behavior.',
      suggestedCorrection: 'Prefer explicit parsing, validated input, or safer APIs.',
      correctedCode: code.replace(/eval\s*\(|exec\s*\(/gi, '// Removed unsafe dynamic execution'),
    });
  }

  return {
    qualityScore: issues.length === 0 ? 92 : Math.max(52, 100 - issues.length * 12),
    summary: `Static inspection reviewed ${language || 'unknown'} code and identified ${issues.length} notable concerns. No definitive runtime bug was proven without execution and full context.`,
    issues,
  };
}

export async function generateExplanation({ code, language }) {
  const overview = `This ${language || 'unknown'} program is being explained as a sequence of operations. The parser treats the code as an executable script with variables, control flow, and possible output generation.`;

  const steps = [
    'The program starts execution at the first statement.',
    'Values are assigned and variables are tracked in the current scope.',
    'Conditional checks and loops modify the execution path.',
    'Output is generated for console or standard output.',
    'The final result is returned or displayed to the user.',
  ];

  return { overview, steps };
}

export async function convertCode({ code, sourceLanguage, targetLanguage }) {
  const cleaned = code.trim();
  const conversions = {
    'python->javascript': 'console.log("Converted from Python to JavaScript");\n',
    'javascript->python': 'print("Converted from JavaScript to Python")\n',
    'java->python': 'print("Converted from Java to Python")\n',
    'c->python': 'print("Converted from C to Python")\n',
    'cpp->java': 'public class Main { public static void main(String[] args) { System.out.println("Converted from C++ to Java"); } }\n',
  };

  const key = `${sourceLanguage}->${targetLanguage}`.toLowerCase();
  const converted = conversions[key] || `// Converted from ${sourceLanguage} to ${targetLanguage}\n${cleaned}\n`;

  return {
    note: `Heuristic conversion prepared from ${sourceLanguage} to ${targetLanguage}. Gemini-backed conversion can be enabled by adding a GEMINI_API_KEY.`,
    convertedCode: converted,
  };
}

export async function maybeGeminiRequest({ prompt, systemPrompt, model = 'gemini-1.5-flash' }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      systemInstruction: systemPrompt,
    }),
  });

  if (!response.ok) return null;
  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
}

import React, { useState } from 'react';
import Editor from '@monaco-editor/react';

const languages = ['python', 'javascript', 'typescript', 'java', 'c', 'cpp', 'csharp', 'go', 'rust', 'ruby', 'php', 'html', 'css', 'sql', 'json', 'bash', 'powershell', 'swift', 'kotlin', 'r', 'dart', 'yaml', 'xml', 'matlab'];
const initialCode = 'def greet(name):\n    return f"Hello, {name}!"\n\nprint(greet("CodeGuru"))\n';

export default function App() {
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState(initialCode);
  const [input, setInput] = useState('');
  const [tab, setTab] = useState('Editor');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [target, setTarget] = useState('javascript');

  async function request(endpoint, body) {
    setBusy(true);
    try {
      const response = await fetch(`/api/${endpoint}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: `Could not connect to CodeGuru backend: ${error.message}` });
    } finally { setBusy(false); }
  }

  function upload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    file.text().then((text) => {
      setCode(text);
      const ext = file.name.split('.').pop().toLowerCase();
      const extensionMap = { py: 'python', js: 'javascript', ts: 'typescript', java: 'java', c: 'c', cpp: 'cpp', html: 'html', css: 'css', sql: 'sql', json: 'json', rb: 'ruby', go: 'go', rs: 'rust' };
      if (extensionMap[ext]) setLanguage(extensionMap[ext]);
    });
    event.target.value = '';
  }

  const run = () => request('execute', { code, language, input, fileName: `main.${language === 'python' ? 'py' : language === 'javascript' ? 'js' : 'txt'}` });
  const analyze = () => request('analyze', { code, language });
  const review = () => request('review', { code, language });
  const explain = () => request('explain', { code, language });
  const convert = () => request('convert', { code, sourceLanguage: language, targetLanguage: target });

  return <div className="layout">
    <aside className="sidebar">
      <a className="brand" href="#home"><span className="brand-icon">G</span><span><b>CodeGuru</b><small>AI programming studio</small></span></a>
      <p className="nav-caption">WORKSPACE</p>
      {['Dashboard', 'Universal Code Editor', 'Code Converter', 'Code Execution', 'Visualize Code', 'Memory Visualizer', 'Data Structure Visualizer', 'AI Code Reviewer', 'AI Code Explainer', 'Learning Playground'].map((name) => <button key={name} onClick={() => setTab(name)} className={`nav-link ${tab === name || (tab === 'Editor' && name === 'Universal Code Editor') ? 'selected' : ''}`}><span className="nav-dot" />{name}</button>)}
      <div className="sidebar-note"><span className="status-dot" /> Ready to build<br /><small>Write. Convert. Execute. Visualize. Review.</small></div>
    </aside>
    <main className="main">
      <header className="topbar"><div><div className="breadcrumb">Workspace <span>/</span> {tab}</div><h1>{tab === 'Universal Code Editor' ? 'Code workspace' : tab}</h1></div><div className="top-actions"><span className="secure-label">● &nbsp;Local workspace</span><button className="button secondary" onClick={analyze}>Analyze code</button></div></header>
      {tab === 'Dashboard' ? <section className="hero card"><div className="hero-copy"><span className="eyebrow">YOUR AI PROGRAMMING STUDIO</span><h2>Turn ideas into<br /><span>working code.</span></h2><p>Write, understand, and explore code across languages in one focused workspace.</p><button className="button primary" onClick={() => setTab('Universal Code Editor')}>Open code editor <span>→</span></button></div><div className="hero-art"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="hero-mark">{'</>'}</div><span className="float-tag tag-one">✦ &nbsp; AI assisted</span><span className="float-tag tag-two">{ } &nbsp; Multi-language</span></div><div className="hero-footer"><span><i className="status-dot"/>Workspace ready</span><span>Write. Convert. Execute. Visualize. Review.</span></div></section> : <section className="card workspace">
        <div className="toolbar"><div className="file-label"><span className="file-icon">⌘</span><b>main.{language === 'python' ? 'py' : language === 'javascript' ? 'js' : language}</b><span className="unsaved">●</span></div><div className="toolbar-actions"><select aria-label="Programming language" value={language} onChange={(e) => setLanguage(e.target.value)}>{languages.map((item) => <option key={item} value={item}>{item}</option>)}</select><label className="button secondary upload">Upload<input type="file" onChange={upload} /></label><button className="button secondary" onClick={() => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([code], { type: 'text/plain' })); a.download = `main.${language}`; a.click(); URL.revokeObjectURL(a.href); }}>Download</button><button className="button primary run" onClick={run} disabled={busy}>▶ &nbsp;{busy ? 'Working…' : 'Run code'}</button></div></div>
        <div className="editor"><Editor height="420px" language={language === 'bash' ? 'shell' : language} theme="vs-light" value={code} onChange={(value) => setCode(value || '')} options={{ minimap: { enabled: false }, fontSize: 14, lineNumbers: 'on', automaticLayout: true, tabSize: 4, formatOnPaste: true, formatOnType: true, scrollBeyondLastLine: false }} /></div>
        <div className="input-box"><div className="input-heading"><span>STANDARD INPUT</span><small>Optional program input</small></div><textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Enter input here…" /></div>
        <div className="quick-actions"><button onClick={analyze}>Analyze</button><button onClick={review}>Review</button><button onClick={explain}>Explain</button><button onClick={() => setTab('Code Converter')}>Convert</button><button onClick={() => setTab('Visualize Code')}>Visualize</button></div>
      </section>}
      {tab === 'Code Converter' && <section className="card tool-card"><h2>Convert code</h2><p>Translate the current editor code into another language. Configure Gemini on the server for AI-powered conversion.</p><label>Target language <select value={target} onChange={(e) => setTarget(e.target.value)}>{languages.map((item) => <option key={item}>{item}</option>)}</select></label><button className="button primary" onClick={convert} disabled={busy}>Convert code</button></section>}
      {tab === 'Code Execution' && <section className="card tool-card"><h2>Code execution</h2><p>Run the active editor code, or review the result of your last run.</p><button className="button primary" onClick={run} disabled={busy}>▶ Run code</button></section>}
      {tab === 'AI Code Reviewer' && <section className="card tool-card"><h2>AI code review</h2><p>Review the active code for potential issues. Findings are best-effort, not a substitute for testing.</p><button className="button primary" onClick={review} disabled={busy}>Review code</button></section>}
      {tab === 'AI Code Explainer' && <section className="card tool-card"><h2>Explain my code</h2><p>Get a beginner-friendly explanation of the current code.</p><button className="button primary" onClick={explain} disabled={busy}>Explain code</button></section>}
      {['Visualize Code', 'Memory Visualizer', 'Data Structure Visualizer', 'Learning Playground'].includes(tab) && <section className="card tool-card"><h2>{tab}</h2><p>Analyze code to select relevant visualization panels. Static visualizations are approximations, not runtime traces.</p><button className="button primary" onClick={analyze} disabled={busy}>Analyze for visualization</button></section>}
      {tab !== 'Dashboard' && tab !== 'Universal Code Editor' && <section className="card compact-editor"><div className="compact-heading"><span>ACTIVE SOURCE</span><button onClick={() => setTab('Universal Code Editor')}>Open editor →</button></div><pre>{code}</pre></section>}
      {result && <section className="card result-card"><div className="result-heading"><div><span className="eyebrow">CODEGURU RESPONSE</span><h2>Results</h2></div><button className="close-result" aria-label="Clear results" onClick={() => setResult(null)}>×</button></div>{result.error ? <p className="error-text">{result.error}</p> : <Result data={result} />}</section>}
      <footer>CodeGuru <span>·</span> Write. Convert. Execute. Visualize. Review.</footer>
    </main>
  </div>;
}

function Result({ data }) {
  if (data.status) return <div className="result-grid"><div><b>Status</b><p>{data.status}</p></div><div><b>Exit code</b><p>{data.exitCode ?? '—'}</p></div><div><b>Time</b><p>{data.executionTimeMs ?? 0} ms</p></div><div className="output"><b>Actual standard output</b><pre>{data.output || '(no output)'}</pre></div><div className="output"><b>Standard error</b><pre>{data.stderr || '(none)'}</pre></div><div className="output"><b>Execution details</b><p>{data.message || data.reason || 'Execution result from configured backend.'}</p></div></div>;
  return <div className="result-grid"><div className="output"><b>Summary</b><p>{data.summary || data.overview || data.note || 'Analysis complete.'}</p></div>{data.convertedCode && <div className="output"><b>Converted code</b><pre>{data.convertedCode}</pre></div>}{data.issues?.length > 0 && <div className="output"><b>Findings</b>{data.issues.map((issue, i) => <p key={i}><strong>{issue.severity}: {issue.title}</strong> — {issue.explanation}</p>)}</div>}{data.steps?.length > 0 && <div className="output"><b>Explanation</b><ol>{data.steps.map((step, i) => <li key={i}>{step}</li>)}</ol></div>}{data.panels?.length > 0 && <div className="output"><b>Relevant panels</b><p>{data.panels.join(' · ')}</p></div>}{data.warnings?.map((warning, i) => <p className="warning" key={i}>{warning}</p>)}{data.qualityScore != null && <p>Quality score: <strong>{data.qualityScore}/100</strong></p>}</div>;
}

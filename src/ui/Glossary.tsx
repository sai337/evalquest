import { GLOSSARY } from '../engine/glossary';
import { FAILURES } from '../engine/taxonomy';

export function Glossary() {
  return (
    <>
      <a href="#/" className="back">← Map</a>
      <h1>Glossary</h1>
      <div className="grid two">
        {Object.entries(GLOSSARY).map(([k, g]) => (
          <div key={k} id={k} className="panel">
            <b>{g.term}</b>
            <p className="muted small">{g.def}</p>
          </div>
        ))}
      </div>
      <h2>Failure taxonomy</h2>
      <div className="grid two">
        {Object.entries(FAILURES).map(([k, f]) => (
          <div key={k} className="panel">
            <b>{f.label}</b> <code className="chip">{k}</code>
            <p className="muted small">{f.hint}</p>
          </div>
        ))}
      </div>
    </>
  );
}

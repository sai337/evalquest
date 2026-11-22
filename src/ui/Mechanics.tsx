import { useState } from 'react';
import type { EvalBug, Pack, TwinTrace } from '../engine/schema';
import { gradeEvalBug, gradeTwinTrace } from '../engine/graders';
import { EVAL_BUGS, EVAL_BUG_TYPES, FAILURES, FAILURE_CODES, TWIN_CAUSES, TWIN_CAUSE_INFO } from '../engine/taxonomy';
import { Feedback, StepBody } from './common';
import type { OnScore } from './ChallengeView';

function Picker<T extends string>({ items, value, answer, done, label, hint, onPick }: {
  items: readonly T[]; value: string; answer?: string; done: boolean; label: (x: T) => string; hint: (x: T) => string; onPick: (x: T) => void;
}) {
  return (
    <>
      <div className="cats">
        {items.map((c) => {
          const cls = done ? (c === answer ? 'ans' : c === value ? 'wrong' : '') : c === value ? 'picked' : '';
          return (
            <button key={c} className={`cat ${cls}`} onClick={() => !done && onPick(c)} title={hint(c)} aria-pressed={c === value}>{label(c)}</button>
          );
        })}
      </div>
      <p className="muted small cat-hint">{value ? `${label(value as T)}: ${hint(value as T)}` : 'Tap one to see what it means.'}</p>
    </>
  );
}

/** Two runs of the same task side by side: find where run B first goes wrong, name it, and say why it diverged. */
export function TwinPlayer({ ch, pack, onScore }: { ch: TwinTrace; pack: Pack; onScore: OnScore }) {
  const [step, setStep] = useState('');
  const [code, setCode] = useState('');
  const [cause, setCause] = useState('');
  const [result, setResult] = useState<ReturnType<typeof gradeTwinTrace> | null>(null);
  const submit = () => {
    const r = gradeTwinTrace(ch, { step, code, cause });
    setResult(r);
    onScore(ch, r.score);
  };
  return (
    <>
      <h3>1 · Tap the first step in “{ch.label_b}” that goes wrong</h3>
      <div className="grid two twin">
        <div>
          <div className="eyebrow">{ch.label_a} · reference</div>
          <div className="trace">{ch.trace_a.map((s) => <div key={s.id} className={`step ${s.role} static`}><StepBody s={s} /></div>)}</div>
        </div>
        <div>
          <div className="eyebrow">{ch.label_b}</div>
          <div className="trace">
            {ch.trace_b.map((s) => {
              const cls = result ? (s.id === ch.answer.step ? 'ans' : s.id === step ? 'wrong' : '') : s.id === step ? 'picked' : '';
              return (
                <button key={s.id} className={`step ${s.role} ${cls}`} onClick={() => !result && setStep(s.id)} aria-pressed={s.id === step}>
                  <StepBody s={s} />
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <details className="small muted">
        <summary>{pack.agent.name}'s policies</summary>
        <ul>{pack.agent.policies.map((p) => <li key={p}>{p}</li>)}</ul>
      </details>
      <h3>2 · Name the failure</h3>
      <Picker items={FAILURE_CODES} value={code} answer={ch.answer.code} done={!!result} label={(c) => FAILURES[c].label} hint={(c) => FAILURES[c].hint} onPick={setCode} />
      <h3>3 · Why did the runs diverge?</h3>
      <Picker items={TWIN_CAUSES} value={cause} answer={ch.answer.cause} done={!!result} label={(c) => c[0].toUpperCase() + c.slice(1)} hint={(c) => TWIN_CAUSE_INFO[c]} onPick={setCause} />
      {!result ? (
        <button className="btn primary" disabled={!step || !code || !cause} onClick={submit}>Submit verdict</button>
      ) : (
        <Feedback ok={result.correct} score={result.score}>
          <p className="small">
            Step: {result.stepRight ? '✓' : '✗'} ({ch.answer.step}) · Failure: {result.codeRight ? '✓' : '✗'} ({FAILURES[ch.answer.code].label}
            {ch.answer.also_accept.length > 0 && `; also accepted: ${ch.answer.also_accept.map((c) => FAILURES[c].label).join(', ')}`}) · Cause:{' '}
            {result.causeRight ? '✓' : '✗'} ({ch.answer.cause})
          </p>
          <p>{ch.explanation}</p>
          {!result.correct && <button className="btn" onClick={() => { setResult(null); setStep(''); setCode(''); setCause(''); }}>Try again</button>}
        </Feedback>
      )}
    </>
  );
}

const ARTIFACT = { judge_prompt: 'Judge prompt', grader: 'Grader code', harness: 'Harness config' } as const;

/** Click the buggy line in a judge prompt, grader or harness config, then classify the bug. */
export function EvalBugPlayer({ ch, onScore }: { ch: EvalBug; onScore: OnScore }) {
  const [line, setLine] = useState(0);
  const [type, setType] = useState('');
  const [result, setResult] = useState<ReturnType<typeof gradeEvalBug> | null>(null);
  const submit = () => {
    const r = gradeEvalBug(ch, { line, bug_type: type });
    setResult(r);
    onScore(ch, r.score);
  };
  return (
    <>
      <h3>1 · Tap the buggy line</h3>
      <div className="code-block" role="list" aria-label={ARTIFACT[ch.artifact]}>
        <div className="eyebrow">{ARTIFACT[ch.artifact]} · {ch.language}</div>
        {ch.code_lines.map((l, i) => {
          const n = i + 1;
          const cls = result ? (n === ch.answer.line ? 'ans' : n === line ? 'wrong' : '') : n === line ? 'picked' : '';
          return (
            <button key={n} role="listitem" className={`code-line ${cls}`} disabled={!l.trim()} onClick={() => !result && setLine(n)} aria-pressed={n === line}>
              <span className="ln">{n}</span><code>{l || ' '}</code>
            </button>
          );
        })}
      </div>
      <h3>2 · What kind of eval bug is it?</h3>
      <Picker items={EVAL_BUG_TYPES} value={type} answer={ch.answer.bug_type} done={!!result} label={(c) => EVAL_BUGS[c].label} hint={(c) => EVAL_BUGS[c].hint} onPick={setType} />
      {!result ? (
        <button className="btn primary" disabled={!line || !type} onClick={submit}>Submit</button>
      ) : (
        <Feedback ok={result.correct} score={result.score}>
          <p className="small">Line: {result.lineRight ? '✓' : '✗'} ({ch.answer.line}) · Bug: {result.typeRight ? '✓' : '✗'} ({EVAL_BUGS[ch.answer.bug_type].label})</p>
          <p>{ch.explanation}</p>
          {!result.correct && <button className="btn" onClick={() => { setResult(null); setLine(0); setType(''); }}>Try again</button>}
        </Feedback>
      )}
    </>
  );
}

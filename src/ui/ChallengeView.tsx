import { useState, type ReactNode } from 'react';
import type { Challenge, JudgeBuilder, Mcq, Pack, SpotFailure } from '../engine/schema';
import type { Progress } from '../engine/progress';
import { gradeMcq, gradeSpotFailure, scoreJudge, type JudgeSpec } from '../engine/graders';
import { FAILURES, FAILURE_CODES, TIER_INFO } from '../engine/taxonomy';
import { applyHint, attemptOutcome, HINT_COST, nextUnsolved } from '../engine/play';
import { CONFIDENCE_LEVELS } from '../engine/calibration';
import type { Tier } from '../engine/taxonomy';
import { GLOSSARY } from '../engine/glossary';
import { TYPE_LABEL } from './PackView';

type OnScore = (ch: Challenge, score: number) => void;
export interface AttemptMeta { correct: boolean; review: 'correct' | 'miss' | null; confidence: number | null }
export interface Gate { unlocked: boolean; below?: Tier; mastery: number }

const PROVENANCE_LABEL = { documented: '📰 Documented incident', benchmark: '📊 From a benchmark', hypothetical: '🧪 Hypothetical' } as const;

export function ChallengeView({ pack, packs, challenge: ch, progress, gate, onScore: rawScore }: {
  pack: Pack; packs: Pack[]; challenge: Challenge; progress: Progress; gate: Gate;
  onScore: (ch: Challenge, score: number, meta: AttemptMeta) => void;
}) {
  const idx = pack.challenges.findIndex((c) => c.id === ch.id);
  const solved = new Set(Object.keys(progress.solved).filter((k) => progress.solved[k].score === 1));
  const next = pack.challenges[idx + 1] ?? nextUnsolved(packs.flatMap((p) => p.challenges), ch.id, solved);
  const [usedHint, setUsedHint] = useState(false);
  const [preview, setPreview] = useState(false);
  const [concept, setConcept] = useState<string | null>(null);
  const best = progress.solved[ch.id];
  const [confidence, setConfidence] = useState<number | null>(null);
  const onScore: OnScore = (c, s) => {
    if (preview) return; // locked-tier previews earn nothing and are not logged
    rawScore(c, applyHint(s, usedHint), { ...attemptOutcome(c.type, s, usedHint), confidence });
    setConfidence(null); // pick again for the next attempt
  };
  const source = ch.source ? pack.sources.find((x) => x.title === ch.source) : undefined;

  if (!gate.unlocked && !preview)
    return (
      <>
        <a href={`#/pack/${pack.id}`} className="back">← {pack.icon} {pack.title}</a>
        <h1>🔒 {ch.title}</h1>
        <div className="panel lock">
          <p>
            <b>{TIER_INFO[ch.tier].label}</b> unlocks at 75% mastery of <b>{gate.below ? TIER_INFO[gate.below].label : 'the tier below'}</b>. You're at{' '}
            <b>{Math.round(gate.mastery * 100)}%</b>.
          </p>
          <div className="bar"><i style={{ width: `${Math.min(100, (gate.mastery / 0.75) * 100)}%` }} /></div>
          <p className="muted small">Mastery is your average best score across that tier, partial credit included.</p>
          <div className="nav-row">
            {gate.below && <a className="btn primary" href={`#/tier/${gate.below}`}>Go to {TIER_INFO[gate.below].label} →</a>}
            <button className="btn" onClick={() => setPreview(true)}>Preview (no XP)</button>
          </div>
        </div>
      </>
    );

  return (
    <>
      <a href={`#/pack/${pack.id}`} className="back">← {pack.icon} {pack.title}</a>
      <div className="chips">
        <span className="chip" style={{ borderColor: TIER_INFO[ch.tier].color, color: TIER_INFO[ch.tier].color }}>{TIER_INFO[ch.tier].label}</span>
        <span className="chip">{TYPE_LABEL[ch.type]}</span>
        <span className="chip">{ch.xp} XP</span>
        <span className="chip" title={source ? source.title : 'Designed for practice; not a real incident'}>{PROVENANCE_LABEL[ch.provenance]}</span>
        {best && <span className="chip ok">best: {Math.round(best.score * 100)}%</span>}
        {preview && <span className="chip">preview · no XP</span>}
      </div>
      <h1>{ch.title}</h1>
      <p className="lede">{ch.brief}</p>
      {ch.concepts.length > 0 && (
        <div className="chips">
          <span className="muted small">Concepts:</span>
          {ch.concepts.map((k) => (
            <button key={k} className={`chip link ${concept === k ? 'on' : ''}`} onClick={() => setConcept(concept === k ? null : k)}>
              {GLOSSARY[k]?.term ?? k}
            </button>
          ))}
        </div>
      )}
      {concept && <div className="panel small concept">{GLOSSARY[concept]?.def}</div>}
      {ch.hint && (usedHint ? (
        <div className="panel small hint">💡 {ch.hint}</div>
      ) : (
        <button className="btn small-btn" onClick={() => setUsedHint(true)}>💡 Show a hint (−{HINT_COST * 100}% XP)</button>
      ))}

      {source && (
        <p className="small muted">
          Based on: <a href={source.url} target="_blank" rel="noreferrer">{source.title}</a>{!source.verified && ' (unverified)'}
        </p>
      )}
      {!preview && (
        <div className="confidence" role="group" aria-label="How sure are you?">
          <span className="muted small">How sure are you? (optional)</span>
          {CONFIDENCE_LEVELS.map((p) => (
            <button key={p} className={`chip link ${confidence === p ? 'on' : ''}`} aria-pressed={confidence === p} onClick={() => setConfidence(confidence === p ? null : p)}>
              {Math.round(p * 100)}%
            </button>
          ))}
        </div>
      )}

      {ch.type === 'spot_failure' && <SpotPlayer ch={ch} pack={pack} onScore={onScore} />}
      {ch.type === 'mcq' && <McqPlayer ch={ch} onScore={onScore} />}
      {ch.type === 'judge_builder' && <JudgePlayer ch={ch} onScore={onScore} />}

      <div className="nav-row">
        <a href={`#/pack/${pack.id}`} className="btn">Back to pack</a>
        {next ? <a href={`#/c/${next.id}`} className="btn primary">Next challenge →</a> : <a href="#/" className="btn primary">All solved, back to the map 🏆</a>}
      </div>
    </>
  );
}

function Feedback({ ok, score, children }: { ok: boolean; score: number; children: ReactNode }) {
  return (
    <div className={`panel feedback ${ok ? 'good' : score > 0 ? 'meh' : 'bad'}`}>
      <b>{ok ? '✅ Nailed it.' : score > 0 ? `🟡 Partly right (${Math.round(score * 100)}%).` : '❌ Not quite.'}</b>
      {children}
    </div>
  );
}

const roleLabel: Record<string, string> = { user: '👤 User', agent: '🤖 Agent', tool_call: '🛠 Tool call', tool_result: '📦 Tool result', system: '⚙️ System' };

function SpotPlayer({ ch, pack, onScore }: { ch: SpotFailure; pack: Pack; onScore: OnScore }) {
  const [steps, setSteps] = useState<string[]>([]);
  const [cat, setCat] = useState('');
  const [result, setResult] = useState<ReturnType<typeof gradeSpotFailure> | null>(null);
  const toggle = (id: string) => !result && setSteps((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const submit = () => {
    const r = gradeSpotFailure(ch, { steps, category: cat });
    setResult(r);
    onScore(ch, r.score);
  };
  const reset = () => {
    setResult(null);
    setSteps([]);
    setCat('');
  };

  return (
    <>
      <h3>1 · Tap the failing step{ch.answer.steps.length > 1 ? 's' : ''} in the trace</h3>
      <div className="trace">
        {ch.trace.map((s) => {
          const picked = steps.includes(s.id);
          const isAns = ch.answer.steps.includes(s.id);
          const cls = result ? (isAns ? 'ans' : picked ? 'wrong' : '') : picked ? 'picked' : '';
          return (
            <button key={s.id} className={`step ${s.role} ${cls}`} onClick={() => toggle(s.id)} aria-pressed={picked}>
              <span className="step-role">{roleLabel[s.role]} <span className="muted">{s.id}</span></span>
              {s.role === 'tool_call' ? (
                <code>{s.tool}({JSON.stringify(s.args ?? {})})</code>
              ) : s.role === 'tool_result' ? (
                <code>{s.content}</code>
              ) : (
                <span>{s.content}</span>
              )}
            </button>
          );
        })}
      </div>
      <details className="small muted">
        <summary>{pack.agent.name}'s policies</summary>
        <ul>{pack.agent.policies.map((p) => <li key={p}>{p}</li>)}</ul>
      </details>
      <h3>2 · Name the failure</h3>
      <div className="cats">
        {FAILURE_CODES.map((c) => {
          const cls = result ? (c === ch.answer.category ? 'ans' : c === cat ? 'wrong' : '') : c === cat ? 'picked' : '';
          return (
            <button key={c} className={`cat ${cls}`} onClick={() => !result && setCat(c)} title={FAILURES[c].hint} aria-pressed={c === cat}>
              {FAILURES[c].label}
            </button>
          );
        })}
      </div>
      <p className="muted small cat-hint">{cat ? `${FAILURES[cat as keyof typeof FAILURES].label}: ${FAILURES[cat as keyof typeof FAILURES].hint}` : 'Tap a category to see what it means.'}</p>
      {!result ? (
        <button className="btn primary" disabled={!steps.length || !cat} onClick={submit}>Submit verdict</button>
      ) : (
        <Feedback ok={result.correct} score={result.score}>
          <p className="small">
            Step{ch.answer.steps.length > 1 ? 's' : ''}: {result.stepsRight ? '✓' : '✗'} ({ch.answer.steps.join(', ')}) · Category:{' '}
            {result.categoryRight ? '✓' : '✗'} ({FAILURES[ch.answer.category].label}
            {ch.answer.also_accept.length > 0 && `; also accepted: ${ch.answer.also_accept.map((c) => FAILURES[c].label).join(', ')}`})
          </p>
          {result.altAccepted && <p className="small muted">Your code is a defensible reading too. The main code is the one the explanation teaches.</p>}
          <p>{ch.explanation}</p>
          {!result.correct && <button className="btn" onClick={reset}>Try again</button>}
        </Feedback>
      )}
    </>
  );
}

function McqPlayer({ ch, onScore }: { ch: Mcq; onScore: OnScore }) {
  const [pick, setPick] = useState<string | null>(null);
  const done = pick !== null;
  return (
    <>
      <div className="panel question">{ch.question}</div>
      <div className="options">
        {ch.options.map((o) => {
          const cls = done ? (o.id === ch.answer ? 'ans' : o.id === pick ? 'wrong' : '') : '';
          return (
            <button key={o.id} className={`option ${cls}`} disabled={done} onClick={() => { setPick(o.id); onScore(ch, gradeMcq(ch, o.id).score); }}>
              <b>{o.id.toUpperCase()}</b> {o.text}
            </button>
          );
        })}
      </div>
      {done && (
        <Feedback ok={pick === ch.answer} score={pick === ch.answer ? 1 : 0}>
          <p>{ch.explanation}</p>
          {pick !== ch.answer && <button className="btn" onClick={() => setPick(null)}>Try again</button>}
        </Feedback>
      )}
    </>
  );
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

function JudgePlayer({ ch, onScore }: { ch: JudgeBuilder; onScore: OnScore }) {
  const [criteria, setCriteria] = useState<string[]>([]);
  const [rule, setRule] = useState<JudgeSpec['rule']>('all');
  const [k, setK] = useState(1);
  const [runs, setRuns] = useState(0);
  const [result, setResult] = useState<ReturnType<typeof scoreJudge> | null>(null);
  const [reveal, setReveal] = useState(false);
  const toggle = (id: string) => setCriteria((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const run = () => {
    const r = scoreJudge(ch, { criteria, rule, k });
    setResult(r);
    setRuns((n) => n + 1);
    // full XP within 3 runs, half after that: iterating is the skill, guessing blindly is not
    onScore(ch, r.passed ? (runs < 3 ? 1 : 0.5) : 0);
  };
  const byId = Object.fromEntries((result?.perSample ?? []).map((s) => [s.id, s]));

  return (
    <>
      <div className="panel question">{ch.question} <span className="muted small">Target: ≥ {pct(ch.target_agreement)} agreement with humans.</span></div>
      <div className="grid two judge">
        <div className="panel">
          <h3>Your judge</h3>
          {ch.criteria.map((c) => (
            <label key={c.id} className="check">
              <input type="checkbox" checked={criteria.includes(c.id)} onChange={() => toggle(c.id)} /> {c.text}
            </label>
          ))}
          <div className="rule">
            <label><input type="radio" checked={rule === 'all'} onChange={() => setRule('all')} /> Pass only if <b>all</b> selected checks hold</label>
            <label>
              <input type="radio" checked={rule === 'at_least_k'} onChange={() => setRule('at_least_k')} /> Pass if <b>at least</b>{' '}
              <input type="number" min={1} max={Math.max(1, criteria.length)} value={k} onChange={(e) => setK(Math.max(1, +e.target.value || 1))} /> hold
            </label>
          </div>
          <button className="btn primary" onClick={run}>▶ Run judge on {ch.samples.length} samples</button>
          <div className="muted small">Runs: {runs}</div>
        </div>
        <div className="panel">
          <h3>Judge vs humans</h3>
          {!result ? (
            <p className="muted small">Run your judge to see its agreement, precision and recall on failures, and the confusion matrix.</p>
          ) : (
            <>
              <div className="stats">
                <Stat label="Agreement" value={pct(result.agreement)} good={result.passed} />
                <Stat label="Precision (fails)" value={pct(result.precision)} />
                <Stat label="Recall (fails)" value={pct(result.recall)} />
              </div>
              <table className="cm">
                <thead><tr><th></th><th>Human: fail</th><th>Human: pass</th></tr></thead>
                <tbody>
                  <tr><th>Judge: fail</th><td className="g">{result.tp} caught</td><td className="r">{result.fp} false alarm</td></tr>
                  <tr><th>Judge: pass</th><td className="r">{result.fn} missed</td><td className="g">{result.tn} correct</td></tr>
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
      <h3>Samples</h3>
      <div className="samples">
        {ch.samples.map((s) => {
          const r = byId[s.id];
          return (
            <div key={s.id} className={`sample ${r ? (r.agree ? 'agree' : 'disagree') : ''}`}>
              <div className="muted small">{s.id}{s.input && ` · ${s.input}`}</div>
              <div>{s.output}</div>
              {r && (
                <div className="small verdicts">
                  judge: <b>{r.predicted}</b> · human: <b>{r.human}</b> {r.agree ? '✓' : '✗'}
                  {!r.agree && s.note && <span className="muted"> — {s.note}</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {result && (result.passed || reveal) && (
        <Feedback ok={result.passed} score={result.passed ? 1 : 0}>
          <p>{ch.explanation}</p>
          <p className="small muted">
            Reference judge: {ch.answer.rule === 'all' ? 'all of' : `at least ${ch.answer.k} of`}{' '}
            {ch.answer.criteria.map((id) => ch.criteria.find((c) => c.id === id)?.text).join(' · ')}
          </p>
        </Feedback>
      )}
      {result && !result.passed && !reveal && runs >= 3 && (
        <button className="btn" onClick={() => setReveal(true)}>Stuck? Reveal the reference judge</button>
      )}
    </>
  );
}

function Stat({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className={`stat ${good === undefined ? '' : good ? 'good' : 'bad'}`}>
      <div className="stat-v">{value}</div>
      <div className="muted small">{label}</div>
    </div>
  );
}

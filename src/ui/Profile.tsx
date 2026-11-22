import type { Pack } from '../engine/schema';
import type { Progress, tierMastery } from '../engine/progress';
import { brier, calibrationCurve, type ConfidenceEntry } from '../engine/calibration';
import { dueCards, REVIEW_DAYS, type ReviewState } from '../engine/review';
import { TIERS, TIER_INFO } from '../engine/taxonomy';
import { TYPE_LABEL } from './PackView';

type Mastery = ReturnType<typeof tierMastery>;
const pct = (x: number) => `${Math.round(x * 100)}%`;

export function Profile({ packs, progress, mastery, review, confLog }: { packs: Pack[]; progress: Progress; mastery: Mastery; review: ReviewState; confLog: ConfidenceEntry[] }) {
  const byId = new Map(packs.flatMap((p) => p.challenges.map((c) => [c.id, { c, p }] as const)));
  const due = dueCards(review).filter((id) => byId.has(id));
  const upcoming = Object.entries(review).filter(([id]) => byId.has(id) && !due.includes(id)).sort((a, b) => a[1].due.localeCompare(b[1].due));
  const b = brier(confLog);
  const curve = calibrationCurve(confLog);
  const over = confLog.length ? confLog.reduce((s, e) => s + e.p, 0) / confLog.length - confLog.filter((e) => e.correct).length / confLog.length : 0;

  return (
    <>
      <a href="#/" className="back">← Map</a>
      <div className="eyebrow">Your practice</div>
      <h1>Review, calibration and mastery</h1>
      <p className="lede">Everything here lives in this browser only. Nothing is sent anywhere.</p>

      <h2>🔁 Review deck</h2>
      <p className="muted small">Missed (or hint-assisted) challenges come back after {REVIEW_DAYS.join(', ')} days. Get one right when it's due and it moves to the next interval; after the last, it graduates.</p>
      {due.length === 0 ? (
        <div className="panel small">Nothing due right now. {upcoming.length > 0 && `${upcoming.length} card${upcoming.length > 1 ? 's' : ''} scheduled.`}</div>
      ) : (
        <div className="list">
          {due.map((id) => {
            const { c, p } = byId.get(id)!;
            return (
              <a key={id} href={`#/c/${id}`} className="row">
                <span className="dot part" />
                <span className="grow"><b>{c.title}</b><span className="muted small"> · {p.icon} {p.domain} · {TYPE_LABEL[c.type]}</span></span>
                <span className="muted small">due</span>
              </a>
            );
          })}
        </div>
      )}
      {upcoming.length > 0 && (
        <details className="small muted">
          <summary>Scheduled ({upcoming.length})</summary>
          <ul>{upcoming.map(([id, c]) => <li key={id}>{byId.get(id)!.c.title} — {new Date(c.due).toLocaleDateString()}</li>)}</ul>
        </details>
      )}

      <h2>🎯 Calibration</h2>
      <p className="muted small">Pick a confidence before you answer. If you say 90%, you should be right about 9 times in 10. Restudying makes people feel surer without remembering more, so seeing your own overconfidence is part of the training.</p>
      {confLog.length === 0 ? (
        <div className="panel small">No confidence picks yet. Choose 50/70/90/99% on any challenge before you submit.</div>
      ) : (
        <div className="grid two">
          <div className="panel">
            <Curve curve={curve} />
          </div>
          <div className="panel">
            <div className="stats">
              <div className={`stat ${b! <= 0.15 ? 'good' : b! > 0.25 ? 'bad' : ''}`}><div className="stat-v">{b!.toFixed(3)}</div><div className="muted small">Brier score (0 is perfect, 0.25 = always 50%)</div></div>
              <div className="stat"><div className="stat-v">{confLog.length}</div><div className="muted small">Picks</div></div>
            </div>
            <p className="small">{Math.abs(over) < 0.05 ? 'Well calibrated: your confidence matches your hit rate.' : over > 0 ? `Overconfident by ${pct(over)}: you expect to be right more often than you are.` : `Underconfident by ${pct(-over)}: trust yourself a bit more.`}</p>
          </div>
        </div>
      )}

      <h2>🪜 Mastery</h2>
      <p className="muted small">Each tier opens at 75% mastery (average best score) of the tier below.</p>
      <div className="list">
        {TIERS.map((t) => (
          <a key={t} href={`#/tier/${t}`} className="row">
            <span className="grow"><b style={{ color: TIER_INFO[t].color }}>{mastery[t].unlocked ? '' : '🔒 '}{TIER_INFO[t].label}</b></span>
            <span className="muted small">{mastery[t].total ? `${pct(mastery[t].mastery)} of ${mastery[t].total}` : 'coming soon'}</span>
          </a>
        ))}
      </div>
      <p className="muted small">Solved: {Object.values(progress.solved).filter((x) => x.score === 1).length}</p>
    </>
  );
}

/** Reliability diagram: stated confidence (x) vs observed accuracy (y). The diagonal is perfect calibration. */
function Curve({ curve }: { curve: ReturnType<typeof calibrationCurve> }) {
  const W = 260, H = 200, x = (p: number) => 30 + ((p - 0.4) / 0.6) * (W - 40), y = (a: number) => H - 25 - a * (H - 40);
  const pts = curve.filter((c) => c.accuracy !== null);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Calibration curve">
      <line x1={x(0.4)} y1={y(0.4)} x2={x(1)} y2={y(1)} stroke="currentColor" strokeOpacity={0.3} strokeDasharray="4 4" />
      <line x1={30} y1={H - 25} x2={W - 10} y2={H - 25} stroke="currentColor" strokeOpacity={0.4} />
      <line x1={30} y1={15} x2={30} y2={H - 25} stroke="currentColor" strokeOpacity={0.4} />
      {[0, 0.5, 1].map((a) => <text key={a} x={4} y={y(a) + 4} fontSize={10} fill="currentColor" opacity={0.7}>{pct(a)}</text>)}
      {curve.map((c) => <text key={c.p} x={x(c.p) - 10} y={H - 8} fontSize={10} fill="currentColor" opacity={0.7}>{pct(c.p)}</text>)}
      {pts.length > 1 && <polyline fill="none" stroke="#60a5fa" strokeWidth={2} points={pts.map((c) => `${x(c.p)},${y(c.accuracy!)}`).join(' ')} />}
      {pts.map((c) => (
        <g key={c.p}>
          <circle cx={x(c.p)} cy={y(c.accuracy!)} r={4 + Math.min(6, c.n)} fill="#60a5fa" fillOpacity={0.8} />
          <title>{`${pct(c.p)} confident: right ${pct(c.accuracy!)} of ${c.n}`}</title>
        </g>
      ))}
    </svg>
  );
}

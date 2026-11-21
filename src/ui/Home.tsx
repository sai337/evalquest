import type { Pack } from '../engine/schema';
import { badges, rankFor, tierProgress, totalXp, type Progress } from '../engine/progress';
import { TIERS, TIER_INFO } from '../engine/taxonomy';

export function Home({ packs, progress }: { packs: Pack[]; progress: Progress }) {
  const xp = totalXp(progress);
  const rank = rankFor(xp);
  const tiers = tierProgress(packs, progress);
  const pct = rank.next ? ((xp - rank.xp) / (rank.next.xp - rank.xp)) * 100 : 100;
  const firstOpen = packs.flatMap((p) => p.challenges).find((c) => progress.solved[c.id]?.score !== 1);

  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">Learn evals by doing them</p>
          <h1>
            Become the person who knows <span className="grad">whether the AI actually works.</span>
          </h1>
          <p className="lede">
            Judge real-looking traces from agents that sell, bank and support. Spot the failure, pick the metric, build a
            judge, and prove it agrees with humans. Beginner to SME, free, in your browser.
          </p>
          {firstOpen && (
            <a className="btn primary" href={`#/c/${firstOpen.id}`}>
              {xp === 0 ? 'Start playing →' : 'Continue →'}
            </a>
          )}
        </div>
        <div className="panel rank">
          <div className="muted small">Your rank</div>
          <div className="rank-name">{rank.name}</div>
          <div className="bar">
            <i style={{ width: `${pct}%` }} />
          </div>
          <div className="muted small">
            {xp} XP {rank.next && `· ${rank.next.xp - xp} to ${rank.next.name}`}
          </div>
        </div>
      </section>

      <h2>The ladder</h2>
      <div className="ladder">
        {TIERS.map((t, i) => {
          const tp = tiers[t];
          const info = TIER_INFO[t];
          const locked = tp.total === 0;
          return (
            <div key={t} className={`rung ${locked ? 'locked' : ''}`} style={{ borderColor: info.color }}>
              <div className="rung-n" style={{ background: info.color }}>{i + 1}</div>
              <div>
                <b>{info.label}</b>
                <div className="muted small">{info.blurb}</div>
              </div>
              <div className="small rung-p">{locked ? 'coming soon' : `${tp.done}/${tp.total}`}</div>
            </div>
          );
        })}
      </div>

      <h2>Pick an agent to evaluate</h2>
      <div className="grid">
        {packs.map((p) => {
          const done = p.challenges.filter((c) => progress.solved[c.id]?.score === 1).length;
          return (
            <a key={p.id} className="card" href={`#/pack/${p.id}`}>
              <div className="card-icon">{p.icon}</div>
              <div className="eyebrow">{p.domain}</div>
              <b>{p.title}</b>
              <p className="muted small">{p.summary}</p>
              <div className="bar thin">
                <i style={{ width: `${(done / p.challenges.length) * 100}%` }} />
              </div>
              <div className="muted small">{done}/{p.challenges.length} solved</div>
            </a>
          );
        })}
        <a className="card ghost" href="https://github.com/sai337/evalquest/blob/main/CONTRIBUTING.md" target="_blank" rel="noreferrer">
          <div className="card-icon">＋</div>
          <b>Your industry here</b>
          <p className="muted small">Insurance, healthcare, travel, HR, coding agents… Add a pack in one YAML file.</p>
        </a>
      </div>

      <h2>Badges</h2>
      <div className="badges">
        {badges(packs, progress).map((b) => (
          <div key={b.id} className={`badge ${b.got ? 'got' : ''}`} title={b.desc}>
            <span>{b.icon}</span>
            <div>
              <b>{b.name}</b>
              <div className="muted small">{b.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <h2>Three ways to play</h2>
      <div className="grid three">
        <div className="panel"><b>🔎 Trace Detective</b><p className="muted small">Read an agent's steps and click where it went wrong. Name the failure.</p></div>
        <div className="panel"><b>🧭 Eval Call</b><p className="muted small">Pick the metric, dataset or design that actually catches the problem.</p></div>
        <div className="panel"><b>⚖️ Judge Builder</b><p className="muted small">Build a judge, run it on human-labelled samples, and read its confusion matrix.</p></div>
      </div>
    </>
  );
}

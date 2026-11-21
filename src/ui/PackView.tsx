import type { Pack } from '../engine/schema';
import type { Progress } from '../engine/progress';
import { TIERS, TIER_INFO } from '../engine/taxonomy';

export const TYPE_LABEL = { spot_failure: '🔎 Trace Detective', mcq: '🧭 Eval Call', judge_builder: '⚖️ Judge Builder' } as const;

export function PackView({ pack, progress }: { pack: Pack; progress: Progress }) {
  return (
    <>
      <a href="#/" className="back">← All agents</a>
      <div className="pack-head">
        <div className="card-icon big">{pack.icon}</div>
        <div>
          <div className="eyebrow">{pack.domain}</div>
          <h1>{pack.title}</h1>
          <p className="muted">{pack.agent.description}</p>
        </div>
      </div>
      <div className="grid two">
        <div className="panel">
          <b>Tools {pack.agent.name} can call</b>
          <div className="chips">{pack.agent.tools.map((t) => <code key={t} className="chip">{t}</code>)}</div>
        </div>
        <div className="panel">
          <b>Policies it must follow</b>
          <ul className="small">{pack.agent.policies.map((p) => <li key={p}>{p}</li>)}</ul>
        </div>
      </div>
      {TIERS.map((t) => {
        const list = pack.challenges.filter((c) => c.tier === t);
        if (!list.length) return null;
        return (
          <section key={t}>
            <h2 style={{ color: TIER_INFO[t].color }}>{TIER_INFO[t].label}</h2>
            <div className="list">
              {list.map((c) => {
                const s = progress.solved[c.id];
                return (
                  <a key={c.id} href={`#/c/${c.id}`} className="row">
                    <span className={`dot ${s?.score === 1 ? 'ok' : s ? 'part' : ''}`} />
                    <span className="grow">
                      <b>{c.title}</b>
                      <span className="muted small"> · {TYPE_LABEL[c.type]}</span>
                    </span>
                    <span className="muted small">{s ? `${s.xp}/${c.xp} XP` : `${c.xp} XP`}</span>
                  </a>
                );
              })}
            </div>
          </section>
        );
      })}
    </>
  );
}

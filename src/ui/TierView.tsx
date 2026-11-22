import type { Pack } from '../engine/schema';
import type { Progress, tierMastery } from '../engine/progress';
import { TIER_INFO, type Tier } from '../engine/taxonomy';
import { TYPE_LABEL } from './PackView';

export function TierView({ tier, packs, progress, mastery }: { tier: Tier; packs: Pack[]; progress: Progress; mastery: ReturnType<typeof tierMastery> }) {
  const m = mastery[tier];
  const info = TIER_INFO[tier];
  const groups = packs.map((p) => ({ pack: p, list: p.challenges.filter((c) => c.tier === tier) })).filter((g) => g.list.length);
  const all = groups.flatMap((g) => g.list);
  const done = all.filter((c) => progress.solved[c.id]?.score === 1).length;
  return (
    <>
      <a href="#/" className="back">← Map</a>
      <div className="eyebrow" style={{ color: info.color }}>Tier</div>
      <h1>{info.label}</h1>
      <p className="lede">{info.blurb} {all.length > 0 && <span className="muted">({done}/{all.length} solved · {Math.round(m.mastery * 100)}% mastery)</span>}</p>
      {all.length > 0 && !m.unlocked && <div className="panel small lock">🔒 Locked until you reach 75% mastery on the tier below. You can still preview these challenges (no XP).</div>}
      {all.length === 0 && (
        <div className="panel">
          No challenges at this tier yet. <a href="https://github.com/sai337/evalquest/blob/main/CONTRIBUTING.md" target="_blank" rel="noreferrer">Help write them →</a>
        </div>
      )}
      {groups.map(({ pack, list }) => (
        <section key={pack.id}>
          <h2>{pack.icon} {pack.domain}</h2>
          <div className="list">
            {list.map((c) => {
              const s = progress.solved[c.id];
              return (
                <a key={c.id} href={`#/c/${c.id}`} className="row">
                  <span className={`dot ${s?.score === 1 ? 'ok' : s ? 'part' : ''}`} />
                  <span className="grow"><b>{c.title}</b><span className="muted small"> · {TYPE_LABEL[c.type]}</span></span>
                  <span className="muted small">{s ? `${s.xp}/${c.xp} XP` : `${c.xp} XP`}</span>
                </a>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}

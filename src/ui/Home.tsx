import { useState } from 'react';
import type { Pack } from '../engine/schema';
import { dailyChallenge } from '../engine/play';
import { badges, rankFor, tierProgress, totalXp, type Progress, type tierMastery } from '../engine/progress';
import { dueCards, type ReviewState } from '../engine/review';
import { TIERS, TIER_INFO } from '../engine/taxonomy';

const INTRO_KEY = 'evalquest.intro.dismissed';
const SITE = 'https://evalquest-livid.vercel.app';

export function Home({ packs, progress, mastery, review, onReset }: { packs: Pack[]; progress: Progress; mastery: ReturnType<typeof tierMastery>; review: ReviewState; onReset: () => void }) {
  const [intro, setIntro] = useState(() => {
    try { return !localStorage.getItem(INTRO_KEY); } catch { return true; }
  });
  const [copied, setCopied] = useState(false);
  const all = packs.flatMap((p) => p.challenges.map((c) => ({ ...c, pack: p })));
  // daily puzzle comes from tiers the player has unlocked
  const daily = dailyChallenge(all.filter((c) => mastery[c.tier].unlocked), new Date().toISOString().slice(0, 10));
  const due = dueCards(review).filter((id) => all.some((c) => c.id === id)).length;
  const xp = totalXp(progress);
  const rank = rankFor(xp);
  const tiers = tierProgress(packs, progress);
  const pct = rank.next ? ((xp - rank.xp) / (rank.next.xp - rank.xp)) * 100 : 100;
  const firstOpen = packs.flatMap((p) => p.challenges).find((c) => mastery[c.tier].unlocked && progress.solved[c.id]?.score !== 1);
  const share = async () => {
    const text = `I'm "${rank.name}" (${xp} XP) on EvalQuest — a free game for learning LLM & AI-agent evals. ${SITE}`;
    try {
      if (navigator.share) await navigator.share({ text });
      else { await navigator.clipboard.writeText(text); setCopied(true); }
    } catch { /* cancelled */ }
  };

  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">Learn evals by doing them</p>
          <h1>
            Become the person who knows <span className="grad">whether the AI actually works.</span>
          </h1>
          <p className="lede">
            Judge real-looking traces from agents that sell, bank, book trips, write code, hire and fight outages. Spot the failure, pick the metric, build a
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
          <div className="rank-actions">
            <button className="btn small-btn" onClick={share}>{copied ? 'Copied ✓' : 'Share my rank'}</button>
            {xp > 0 && <button className="linkbtn small" onClick={onReset}>Reset</button>}
          </div>
        </div>
      </section>

      {intro && (
        <div className="panel intro">
          <b>How to play (30 seconds)</b>
          <ol className="small">
            <li>Pick an agent below. Each one has its own tools and policies, like a real product.</li>
            <li>🔎 <b>Trace Detective:</b> read what the agent did step by step, tap where it went wrong, name the failure.</li>
            <li>🧭 <b>Eval Call:</b> choose the eval that would actually catch the problem.</li>
            <li>⚖️ <b>Judge Builder:</b> pick checks for an automated judge, run it on human-labelled samples, and tune until it agrees with the humans.</li>
            <li>👯 <b>Twin Trace</b> and 🐞 <b>Spot the Eval Bug</b> (Advanced): compare two runs of the same task, or find the bug in a grader.</li>
            <li>Every answer explains the <i>why</i>. Stuck? Hints cost 25% of the XP.</li>
            <li>Optional: say how sure you are (50–99%) before answering, and see how calibrated you are on the Practice page. Missed puzzles come back for review after 1, 3 and 7 days.</li>
            <li>Each tier opens at 75% mastery of the tier below.</li>
          </ol>
          <button className="btn" onClick={() => { setIntro(false); try { localStorage.setItem(INTRO_KEY, '1'); } catch { /* ignore */ } }}>Got it</button>
        </div>
      )}

      {daily && (
        <a className="panel daily" href={`#/c/${daily.id}`}>
          <span className="eyebrow">Today's puzzle</span>
          <b>{daily.pack.icon} {daily.title}</b>
          <span className="muted small">{daily.pack.domain} · {TIER_INFO[daily.tier].label} · {daily.xp} XP {progress.solved[daily.id]?.score === 1 ? '· ✅ solved' : ''}</span>
        </a>
      )}

      {due > 0 && (
        <a className="panel daily" href="#/profile">
          <span className="eyebrow">Review deck</span>
          <b>🔁 {due} challenge{due > 1 ? 's' : ''} to review</b>
          <span className="muted small">Spaced review beats rereading. Get them right to push them out to 3 and 7 days.</span>
        </a>
      )}

      <h2>The ladder</h2>
      <div className="ladder">
        {TIERS.map((t, i) => {
          const tp = tiers[t];
          const info = TIER_INFO[t];
          const empty = tp.total === 0;
          const locked = empty || !mastery[t].unlocked;
          return (
            <a key={t} href={`#/tier/${t}`} className={`rung ${locked ? 'locked' : ''}`} style={{ borderColor: info.color }}>
              <div className="rung-n" style={{ background: info.color }}>{i + 1}</div>
              <div>
                <b>{info.label}</b>
                <div className="muted small">{info.blurb}</div>
              </div>
              <div className="small rung-p">{empty ? 'coming soon' : !mastery[t].unlocked ? '🔒 75% below' : `${tp.done}/${tp.total} · ${Math.round(mastery[t].mastery * 100)}% →`}</div>
            </a>
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

      <h2>Five ways to play</h2>
      <div className="grid three">
        <div className="panel"><b>🔎 Trace Detective</b><p className="muted small">Read an agent's steps and click where it went wrong. Name the failure.</p></div>
        <div className="panel"><b>🧭 Eval Call</b><p className="muted small">Pick the metric, dataset or design that actually catches the problem.</p></div>
        <div className="panel"><b>⚖️ Judge Builder</b><p className="muted small">Build a judge, run it on human-labelled samples, and read its confusion matrix.</p></div>
        <div className="panel"><b>👯 Twin Trace</b><p className="muted small">Two runs of the same task. Find where the new one first goes wrong and why: reasoning, coordination or regression.</p></div>
        <div className="panel"><b>🐞 Spot the Eval Bug</b><p className="muted small">The eval itself is broken. Click the buggy line in a grader, judge prompt or harness and name the bug.</p></div>
      </div>
    </>
  );
}

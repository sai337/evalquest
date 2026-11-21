import type { Challenge, Pack } from './schema';
import { TIERS, type Tier } from './taxonomy';

export interface Progress {
  solved: Record<string, { score: number; xp: number; at: string }>;
}

const KEY = 'evalquest.v1';

export function loadProgress(): Progress {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) ?? '');
    if (p && typeof p.solved === 'object') return p;
  } catch {
    /* empty or unavailable storage */
  }
  return { solved: {} };
}

export function saveProgress(p: Progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable: progress lives for this tab only */
  }
}

/** Keeps the best score per challenge; XP is earned in proportion to score. */
export function record(p: Progress, ch: Challenge, score: number): Progress {
  const prev = p.solved[ch.id];
  if (score <= 0 || (prev && prev.score >= score)) return p;
  return { solved: { ...p.solved, [ch.id]: { score, xp: Math.round(ch.xp * score), at: new Date().toISOString() } } };
}

export const totalXp = (p: Progress) => Object.values(p.solved).reduce((s, x) => s + x.xp, 0);

export function tierProgress(packs: Pack[], p: Progress) {
  const out = {} as Record<Tier, { done: number; total: number }>;
  for (const t of TIERS) out[t] = { done: 0, total: 0 };
  for (const pack of packs)
    for (const c of pack.challenges) {
      out[c.tier].total++;
      if ((p.solved[c.id]?.score ?? 0) === 1) out[c.tier].done++;
    }
  return out;
}

export const RANKS = [
  { xp: 0, name: 'Eval Curious' },
  { xp: 500, name: 'Trace Reader' },
  { xp: 1500, name: 'Failure Hunter' },
  { xp: 3000, name: 'Judge Builder' },
  { xp: 5000, name: 'Eval Engineer' },
  { xp: 8000, name: 'Eval Lead' },
  { xp: 12000, name: 'Eval SME' },
];

export function rankFor(xp: number) {
  let r = RANKS[0];
  for (const x of RANKS) if (xp >= x.xp) r = x;
  const next = RANKS.find((x) => x.xp > xp);
  return { ...r, next };
}

export function badges(packs: Pack[], p: Progress) {
  const all = packs.flatMap((x) => x.challenges);
  const solvedOfType = (t: Challenge['type']) => all.filter((c) => c.type === t && p.solved[c.id]?.score === 1).length;
  const list = [
    { id: 'first-blood', icon: '🎯', name: 'First catch', desc: 'Solve your first challenge', got: Object.values(p.solved).some((s) => s.score === 1) },
    { id: 'detective', icon: '🔎', name: 'Trace Detective', desc: 'Solve 5 Trace Detective puzzles', got: solvedOfType('spot_failure') >= 5 },
    { id: 'judge', icon: '⚖️', name: 'Judge of Judges', desc: 'Pass 3 Judge Builder challenges', got: solvedOfType('judge_builder') >= 3 },
  ];
  for (const pack of packs) {
    const done = pack.challenges.every((c) => p.solved[c.id]?.score === 1);
    list.push({ id: `pack-${pack.id}`, icon: pack.icon, name: `${pack.domain} cleared`, desc: `Solve every ${pack.domain} challenge`, got: done });
  }
  return list;
}

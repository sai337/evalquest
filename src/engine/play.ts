/** Small pure helpers for game flow. */

export const HINT_COST = 0.25;
export const applyHint = (score: number, usedHint: boolean) => (usedHint ? score * (1 - HINT_COST) : score);

/** Same puzzle for everyone on a given day (FNV-1a hash of the date). */
export function dailyChallenge<T extends { id: string }>(list: T[], date: string): T | undefined {
  if (!list.length) return undefined;
  let h = 2166136261;
  for (const c of date) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return list[(h >>> 0) % list.length];
}

/** Next challenge after `currentId` that isn't solved, wrapping around; never the current one. */
export function nextUnsolved<T extends { id: string }>(list: T[], currentId: string, solved: Set<string>): T | undefined {
  const i = list.findIndex((c) => c.id === currentId);
  for (let k = 1; k < list.length; k++) {
    const c = list[(i + k) % list.length];
    if (!solved.has(c.id)) return c;
  }
  return undefined;
}

/**
 * How one graded attempt counts. `correct` feeds the confidence log (was the answer right?);
 * `review` feeds the review deck: anything short of a clean, hint-free solve comes back.
 * A failing Judge Builder run is iteration (the mechanic expects several runs), so it is not a miss.
 */
export function attemptOutcome(type: string, rawScore: number, usedHint: boolean): { correct: boolean; review: 'correct' | 'miss' | null } {
  if (type === 'judge_builder') {
    if (rawScore <= 0) return { correct: false, review: null };
    return { correct: true, review: rawScore >= 1 && !usedHint ? 'correct' : 'miss' };
  }
  const correct = rawScore >= 1;
  return { correct, review: correct && !usedHint ? 'correct' : 'miss' };
}

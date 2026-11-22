/** Review deck: missed challenges come back after 1, 3 and 7 days (spaced retrieval). Stored in this browser only. */

export const REVIEW_DAYS = [1, 3, 7] as const;
export type ReviewState = Record<string, { stage: number; due: string }>;

const KEY = 'evalquest.review.v1';
const DAY = 864e5;
const at = (now: Date, days: number) => new Date(now.getTime() + days * DAY).toISOString();

/**
 * A miss (re)starts the card at stage 0, due tomorrow. A correct answer only counts once the card is due:
 * it moves to the next interval, and after the last one the card graduates out of the deck.
 */
export function updateReview(s: ReviewState, id: string, correct: boolean, now = new Date()): ReviewState {
  const card = s[id];
  if (!correct) return { ...s, [id]: { stage: 0, due: at(now, REVIEW_DAYS[0]) } };
  if (!card || new Date(card.due) > now) return s;
  const { [id]: _done, ...rest } = s;
  const stage = card.stage + 1;
  return stage >= REVIEW_DAYS.length ? rest : { ...rest, [id]: { stage, due: at(now, REVIEW_DAYS[stage]) } };
}

export const dueCards = (s: ReviewState, now = new Date()) =>
  Object.entries(s)
    .filter(([, c]) => new Date(c.due) <= now)
    .sort((a, b) => a[1].due.localeCompare(b[1].due))
    .map(([id]) => id);

export function loadReview(): ReviewState {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}

export function saveReview(s: ReviewState) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage unavailable */ }
}

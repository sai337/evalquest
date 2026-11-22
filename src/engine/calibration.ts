/** Optional confidence picks, scored with the Brier score. Stored in this browser only. */

export const CONFIDENCE_LEVELS = [0.5, 0.7, 0.9, 0.99] as const;
export interface ConfidenceEntry { id: string; p: number; correct: boolean; at: string }

const KEY = 'evalquest.calibration.v1';
const MAX = 500;

/** Mean of (confidence − outcome)². 0 is perfect; always saying 50% scores 0.25. */
export function brier(entries: { p: number; correct: boolean }[]): number | null {
  if (!entries.length) return null;
  return entries.reduce((s, e) => s + (e.p - (e.correct ? 1 : 0)) ** 2, 0) / entries.length;
}

/** Observed accuracy at each confidence level: the points of a calibration curve. */
export function calibrationCurve(entries: { p: number; correct: boolean }[]) {
  return CONFIDENCE_LEVELS.map((p) => {
    const at = entries.filter((e) => e.p === p);
    return { p, n: at.length, accuracy: at.length ? at.filter((e) => e.correct).length / at.length : null };
  });
}

export const addConfidence = (log: ConfidenceEntry[], e: ConfidenceEntry) => [...log, e].slice(-MAX);

export function loadConfidence(): ConfidenceEntry[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(v) ? v.filter((e) => e && typeof e.p === 'number' && typeof e.correct === 'boolean') : [];
  } catch {
    return [];
  }
}

export function saveConfidence(log: ConfidenceEntry[]) {
  try { localStorage.setItem(KEY, JSON.stringify(log)); } catch { /* storage unavailable */ }
}

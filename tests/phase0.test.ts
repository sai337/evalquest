/** Phase 0 foundations: taxonomy, also_accept, confidence/Brier, review deck, mastery gating. */
import { describe, expect, it } from 'vitest';
import { FAILURES, FAILURE_CODES } from '../src/engine/taxonomy';
import { GLOSSARY } from '../src/engine/glossary';
import { gradeSpotFailure } from '../src/engine/graders';
import { brier, calibrationCurve, CONFIDENCE_LEVELS, addConfidence } from '../src/engine/calibration';
import { REVIEW_DAYS, dueCards, updateReview } from '../src/engine/review';
import { MASTERY_THRESHOLD, tierMastery } from '../src/engine/progress';
import { PackSchema, type Pack, type SpotFailure } from '../src/engine/schema';

describe('taxonomy: five Phase 0 codes', () => {
  const added = ['unapproved_action', 'spec_gaming', 'coordination_failure', 'misrecognition', 'unsafe_output'];
  it('adds all five with a label and hint, keeping the original ten', () => {
    for (const c of added) {
      expect(FAILURE_CODES).toContain(c);
      const f = FAILURES[c as keyof typeof FAILURES];
      expect(f.label.length).toBeGreaterThan(3);
      expect(f.hint.length).toBeGreaterThan(20);
    }
    expect(FAILURE_CODES.length).toBe(15);
  });
  it('each new code has a glossary concept that teaches its eval', () => {
    for (const k of ['approval-gate', 'spec-gaming', 'coordination', 'perception-evals', 'output-handling'])
      expect(GLOSSARY[k]?.def.length, k).toBeGreaterThan(60);
  });
});

const spot: SpotFailure = {
  id: 't-spot', tier: 'beginner', type: 'spot_failure', title: 't', brief: 'b', xp: 100, concepts: [], provenance: 'hypothetical',
  explanation: 'Hypothetical scenario. The agent booked a non-refundable room without asking.',
  trace: [
    { id: 's1', role: 'user', content: 'any rooms?' },
    { id: 's2', role: 'tool_call', tool: 'book', args: {} },
    { id: 's3', role: 'agent', content: 'booked' },
  ],
  answer: { steps: ['s2'], category: 'unapproved_action', also_accept: ['policy_violation'] },
};

describe('also_accept', () => {
  it('the main code earns full marks', () => expect(gradeSpotFailure(spot, { steps: ['s2'], category: 'unapproved_action' }).score).toBe(1));
  it('a defensible alternative code earns full marks and is flagged', () => {
    const r = gradeSpotFailure(spot, { steps: ['s2'], category: 'policy_violation' });
    expect(r.correct).toBe(true);
    expect(r.altAccepted).toBe(true);
  });
  it('other codes still lose category credit', () => {
    expect(gradeSpotFailure(spot, { steps: ['s2'], category: 'hallucination' }).score).toBeCloseTo(0.6);
  });
  it('schema rejects an also_accept that repeats the main code', () => {
    const pack = {
      id: 'x', title: 'X', domain: 'x', icon: 'x', summary: 's', sources: [{ title: 't', url: 'https://example.com', verified: false }],
      agent: { name: 'a', description: 'd', tools: ['book'] },
      challenges: [1, 2, 3].map((i) => ({ ...spot, id: `x-${i}`, answer: { ...spot.answer, also_accept: ['unapproved_action'] } })),
    };
    expect(PackSchema.safeParse(pack).success).toBe(false);
  });
});

describe('confidence + Brier score', () => {
  it('offers 50/70/90/99%', () => expect(CONFIDENCE_LEVELS).toEqual([0.5, 0.7, 0.9, 0.99]));
  it('Brier is the mean squared gap between confidence and outcome', () => {
    expect(brier([{ p: 0.9, correct: true }, { p: 0.9, correct: false }])).toBeCloseTo((0.01 + 0.81) / 2);
    expect(brier([])).toBeNull();
  });
  it('calibration curve buckets by level with observed accuracy', () => {
    const e = [
      { p: 0.9, correct: true }, { p: 0.9, correct: false }, { p: 0.9, correct: false }, { p: 0.5, correct: true },
    ];
    const c = calibrationCurve(e);
    expect(c.find((b) => b.p === 0.9)).toEqual({ p: 0.9, n: 3, accuracy: 1 / 3 });
    expect(c.find((b) => b.p === 0.7)).toEqual({ p: 0.7, n: 0, accuracy: null });
  });
  it('log keeps the most recent 500 entries', () => {
    let log: ReturnType<typeof addConfidence> = [];
    for (let i = 0; i < 510; i++) log = addConfidence(log, { id: `c${i}`, p: 0.7, correct: true, at: 'x' });
    expect(log.length).toBe(500);
    expect(log[0].id).toBe('c10');
  });
});

describe('review deck (1 / 3 / 7 days)', () => {
  const t0 = new Date('2026-11-21T10:00:00Z');
  const days = (n: number) => new Date(t0.getTime() + n * 864e5);
  it('uses 1, 3, 7 day intervals', () => expect(REVIEW_DAYS).toEqual([1, 3, 7]));
  it('a miss schedules the card for tomorrow', () => {
    const s = updateReview({}, 'a', false, t0);
    expect(s.a).toEqual({ stage: 0, due: days(1).toISOString() });
    expect(dueCards(s, t0)).toEqual([]);
    expect(dueCards(s, days(1))).toEqual(['a']);
  });
  it('a correct answer before it is due changes nothing', () => {
    const s = updateReview({}, 'a', false, t0);
    expect(updateReview(s, 'a', true, t0)).toBe(s);
  });
  it('correct when due advances 1 → 3 → 7 days, then graduates', () => {
    let s = updateReview({}, 'a', false, t0);
    s = updateReview(s, 'a', true, days(1));
    expect(s.a).toEqual({ stage: 1, due: days(4).toISOString() });
    s = updateReview(s, 'a', true, days(4));
    expect(s.a).toEqual({ stage: 2, due: days(11).toISOString() });
    s = updateReview(s, 'a', true, days(11));
    expect(s.a).toBeUndefined();
  });
  it('a miss during review resets to one day', () => {
    let s = updateReview({}, 'a', false, t0);
    s = updateReview(s, 'a', true, days(1));
    s = updateReview(s, 'a', false, days(4));
    expect(s.a).toEqual({ stage: 0, due: days(5).toISOString() });
  });
  it('a first-time correct answer is never added', () => expect(updateReview({}, 'a', true, t0)).toEqual({}));
  it('due cards come oldest first', () => {
    let s = updateReview({}, 'b', false, days(1));
    s = updateReview(s, 'a', false, t0);
    expect(dueCards(s, days(5))).toEqual(['a', 'b']);
  });
});

describe('mastery gating (75% on the tier below)', () => {
  const mk = (id: string, tier: SpotFailure['tier']) => ({ ...spot, id, tier });
  const packs = [{ challenges: [mk('b1', 'beginner'), mk('b2', 'beginner'), mk('p1', 'practitioner'), mk('p2', 'practitioner'), mk('a1', 'advanced'), mk('s1', 'sme')] }] as unknown as Pack[];
  const prog = (scores: Record<string, number>) => ({ solved: Object.fromEntries(Object.entries(scores).map(([k, v]) => [k, { score: v, xp: 1, at: '' }])) });
  it('threshold is 75%', () => expect(MASTERY_THRESHOLD).toBe(0.75));
  it('beginner is always open; the rest stay locked from zero', () => {
    const m = tierMastery(packs, prog({}));
    expect(m.beginner.unlocked).toBe(true);
    expect(m.practitioner.unlocked).toBe(false);
    expect(m.advanced.unlocked).toBe(false);
  });
  it('mastery is the mean best score, partial credit included', () => {
    const m = tierMastery(packs, prog({ b1: 1, b2: 0.6 }));
    expect(m.beginner.mastery).toBeCloseTo(0.8);
    expect(m.practitioner.unlocked).toBe(true);
    expect(m.advanced.unlocked).toBe(false);
  });
  it('74% does not unlock', () => expect(tierMastery(packs, prog({ b1: 1, b2: 0.48 })).practitioner.unlocked).toBe(false));
  it('an empty tier is skipped: SME follows Advanced when Pro has no challenges', () => {
    const m = tierMastery(packs, prog({ b1: 1, b2: 1, p1: 1, p2: 1, a1: 1 }));
    expect(m.pro.total).toBe(0);
    expect(m.sme.unlocked).toBe(true);
    expect(tierMastery(packs, prog({ b1: 1, b2: 1, p1: 1, p2: 1 })).sme.unlocked).toBe(false);
  });
});

describe('attemptOutcome: what counts for calibration and the review deck', () => {
  it('a full-score answer is correct for both', async () => {
    const { attemptOutcome } = await import('../src/engine/play');
    expect(attemptOutcome('spot_failure', 1, false)).toEqual({ correct: true, review: 'correct' });
  });
  it('partial credit is a miss', async () => {
    const { attemptOutcome } = await import('../src/engine/play');
    expect(attemptOutcome('spot_failure', 0.6, false)).toEqual({ correct: false, review: 'miss' });
  });
  it('right with a hint is correct for calibration but comes back for review', async () => {
    const { attemptOutcome } = await import('../src/engine/play');
    expect(attemptOutcome('mcq', 1, true)).toEqual({ correct: true, review: 'miss' });
  });
  it('Judge Builder: a failing run is iteration, not a miss; passing late is a miss', async () => {
    const { attemptOutcome } = await import('../src/engine/play');
    expect(attemptOutcome('judge_builder', 0, false)).toEqual({ correct: false, review: null });
    expect(attemptOutcome('judge_builder', 0.5, false)).toEqual({ correct: true, review: 'miss' });
    expect(attemptOutcome('judge_builder', 1, false)).toEqual({ correct: true, review: 'correct' });
  });
});

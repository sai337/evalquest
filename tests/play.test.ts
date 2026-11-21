import { describe, expect, it } from 'vitest';
import { applyHint, dailyChallenge, nextUnsolved } from '../src/engine/play';

const list = ['a-1', 'a-2', 'b-1', 'b-2'].map((id) => ({ id }));

describe('applyHint', () => {
  it('costs 25% when a hint was used', () => expect(applyHint(1, true)).toBe(0.75));
  it('is free otherwise', () => expect(applyHint(0.6, false)).toBe(0.6));
});

describe('dailyChallenge', () => {
  it('is stable for the same date', () => expect(dailyChallenge(list, '2026-11-21')).toBe(dailyChallenge(list, '2026-11-21')));
  it('changes across days', () => {
    const seen = new Set(['2026-11-21', '2026-11-22', '2026-11-23', '2026-11-24', '2026-11-25'].map((d) => dailyChallenge(list, d)?.id));
    expect(seen.size).toBeGreaterThan(1);
  });
  it('handles an empty list', () => expect(dailyChallenge([], '2026-11-21')).toBeUndefined());
});

describe('nextUnsolved', () => {
  it('returns the next unsolved after the current one, wrapping around', () => {
    const solved = new Set(['a-2']);
    expect(nextUnsolved(list, 'a-1', solved)?.id).toBe('b-1');
    expect(nextUnsolved(list, 'b-2', solved)?.id).toBe('a-1');
  });
  it('returns undefined when everything else is solved', () => {
    expect(nextUnsolved(list, 'a-1', new Set(['a-2', 'b-1', 'b-2']))).toBeUndefined();
  });
});

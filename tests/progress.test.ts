import { describe, expect, it } from 'vitest';
import { rankFor, record, totalXp } from '../src/engine/progress';
import type { Mcq } from '../src/engine/schema';

const ch = { id: 'x-1', xp: 100 } as Mcq;

describe('progress', () => {
  it('ignores zero scores so failed attempts do not show as partial progress', () => {
    expect(record({ solved: {} }, ch, 0).solved).toEqual({});
  });
  it('keeps the best score and awards XP in proportion', () => {
    let p = record({ solved: {} }, ch, 0.6);
    expect(totalXp(p)).toBe(60);
    p = record(p, ch, 0.4);
    expect(totalXp(p)).toBe(60);
    p = record(p, ch, 1);
    expect(totalXp(p)).toBe(100);
  });
  it('ranks by XP', () => {
    expect(rankFor(0).name).toBe('Eval Curious');
    expect(rankFor(1600).name).toBe('Failure Hunter');
    expect(rankFor(99999).next).toBeUndefined();
  });
});

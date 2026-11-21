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

describe('mergeProgress', () => {
  it('keeps the best score per challenge from either side', async () => {
    const { mergeProgress } = await import('../src/engine/progress');
    const a = { solved: { x: { score: 1, xp: 100, at: '1' }, y: { score: 0.4, xp: 40, at: '1' } } };
    const b = { solved: { y: { score: 1, xp: 100, at: '2' }, z: { score: 0.6, xp: 60, at: '2' } } };
    const m = mergeProgress(a, b);
    expect(Object.keys(m.solved).sort()).toEqual(['x', 'y', 'z']);
    expect(m.solved.y.score).toBe(1);
    expect(totalXp(m)).toBe(260);
  });
  it('ignores malformed remote entries', async () => {
    const { mergeProgress } = await import('../src/engine/progress');
    const m = mergeProgress({ solved: {} }, { solved: { bad: 'nope', worse: { score: 5, xp: 1e9, at: '' } } } as never);
    expect(m.solved).toEqual({});
  });
});

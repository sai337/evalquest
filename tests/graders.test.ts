import { describe, expect, it } from 'vitest';
import { gradeMcq, gradeSpotFailure, scoreJudge } from '../src/engine/graders';
import type { JudgeBuilder, Mcq, SpotFailure } from '../src/engine/schema';

const spot: SpotFailure = {
  id: 't-spot', tier: 'beginner', type: 'spot_failure', title: 't', brief: 'b', xp: 100, concepts: [],
  explanation: 'The refund exceeded the approval limit and no human approved it.',
  trace: [
    { id: 's1', role: 'user', content: 'refund me' },
    { id: 's2', role: 'tool_call', tool: 'issue_refund', args: { amount: 500 } },
    { id: 's3', role: 'agent', content: 'done' },
  ],
  answer: { steps: ['s2'], category: 'policy_violation' },
};

describe('gradeSpotFailure', () => {
  it('full marks for right step and category', () => {
    const r = gradeSpotFailure(spot, { steps: ['s2'], category: 'policy_violation' });
    expect(r.correct).toBe(true);
    expect(r.score).toBe(1);
  });
  it('partial credit for right step, wrong category', () => {
    const r = gradeSpotFailure(spot, { steps: ['s2'], category: 'hallucination' });
    expect(r.correct).toBe(false);
    expect(r.score).toBeCloseTo(0.6);
  });
  it('partial credit for right category, wrong step', () => {
    const r = gradeSpotFailure(spot, { steps: ['s3'], category: 'policy_violation' });
    expect(r.score).toBeCloseTo(0.4);
  });
  it('step sets must match exactly (extra steps lose step credit)', () => {
    const r = gradeSpotFailure(spot, { steps: ['s2', 's3'], category: 'policy_violation' });
    expect(r.score).toBeCloseTo(0.4);
  });
});

const mcq: Mcq = {
  id: 't-mcq', tier: 'beginner', type: 'mcq', title: 't', brief: 'b', xp: 50, concepts: [],
  explanation: 'Faithfulness checks whether claims are supported by retrieved context.',
  question: 'q', options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }], answer: 'b',
};

describe('gradeMcq', () => {
  it('correct option', () => expect(gradeMcq(mcq, 'b').correct).toBe(true));
  it('wrong option', () => expect(gradeMcq(mcq, 'a').score).toBe(0));
});

const judge: JudgeBuilder = {
  id: 't-judge', tier: 'practitioner', type: 'judge_builder', title: 't', brief: 'b', xp: 200, concepts: [],
  explanation: 'Only the policy check separates good from bad answers here.',
  question: 'q', target_agreement: 0.75,
  criteria: [{ id: 'polite', text: 'Polite' }, { id: 'policy', text: 'Follows policy' }],
  samples: [
    { id: 'x1', output: 'o', checks: { polite: true, policy: true }, human_label: 'pass' },
    { id: 'x2', output: 'o', checks: { polite: true, policy: false }, human_label: 'fail' },
    { id: 'x3', output: 'o', checks: { polite: false, policy: true }, human_label: 'pass' },
    { id: 'x4', output: 'o', checks: { polite: true, policy: false }, human_label: 'fail' },
  ],
  answer: { criteria: ['policy'], rule: 'all' },
};

describe('scoreJudge', () => {
  it('reference judge agrees 100% and catches every failure', () => {
    const r = scoreJudge(judge, { criteria: ['policy'], rule: 'all' });
    expect(r.agreement).toBe(1);
    expect(r.recall).toBe(1);
    expect(r.precision).toBe(1);
    expect(r.passed).toBe(true);
  });
  it('politeness-only judge misses failures', () => {
    const r = scoreJudge(judge, { criteria: ['polite'], rule: 'all' });
    expect(r.agreement).toBe(0.25);
    expect(r.recall).toBe(0);
    expect(r.passed).toBe(false);
  });
  it('empty judge passes everything and catches nothing', () => {
    const r = scoreJudge(judge, { criteria: [], rule: 'all' });
    expect(r.fn).toBe(2);
    expect(r.tp).toBe(0);
    expect(r.precision).toBe(0);
  });
  it('at_least_k with k=1 over both checks passes everything', () => {
    const r = scoreJudge(judge, { criteria: ['polite', 'policy'], rule: 'at_least_k', k: 1 });
    expect(r.perSample.every((s) => s.predicted === 'pass')).toBe(true);
  });
  it('confusion matrix sums to sample count', () => {
    const r = scoreJudge(judge, { criteria: ['polite', 'policy'], rule: 'all' });
    expect(r.tp + r.fp + r.tn + r.fn).toBe(4);
  });
});

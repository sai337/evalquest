/** Phase 1 mechanics: Twin Trace and Spot the Eval Bug. */
import { describe, expect, it } from 'vitest';
import { firstDivergence, gradeEvalBug, gradeTwinTrace } from '../src/engine/graders';
import { EVAL_BUGS, TWIN_CAUSES } from '../src/engine/taxonomy';
import { ChallengeSchema, type EvalBug, type TwinTrace } from '../src/engine/schema';

const twin: TwinTrace = {
  id: 't-twin', tier: 'advanced', type: 'twin_trace', provenance: 'hypothetical', title: 'Twin', brief: 'Compare', xp: 200, concepts: [],
  explanation: 'Hypothetical scenario. After the update the bot swears when asked to; a regression suite would catch it.',
  label_a: 'Before update', label_b: 'After update',
  trace_a: [
    { id: 'a1', role: 'user', content: 'Swear at me' },
    { id: 'a2', role: 'agent', content: 'I cannot do that.' },
  ],
  trace_b: [
    { id: 'b1', role: 'user', content: 'Swear at me' },
    { id: 'b2', role: 'agent', content: '@#$% you' },
  ],
  answer: { step: 'b2', code: 'policy_violation', also_accept: ['tone_or_format'], cause: 'regression' },
};

describe('Twin Trace', () => {
  it('fixed cause list', () => expect(TWIN_CAUSES).toEqual(['reasoning', 'coordination', 'regression']));
  it('full marks for step, code and cause', () => {
    const r = gradeTwinTrace(twin, { step: 'b2', code: 'policy_violation', cause: 'regression' });
    expect(r.correct).toBe(true);
    expect(r.score).toBe(1);
  });
  it('also_accept codes count', () => expect(gradeTwinTrace(twin, { step: 'b2', code: 'tone_or_format', cause: 'regression' }).correct).toBe(true));
  it('partial credit: step 0.4, code 0.3, cause 0.3', () => {
    expect(gradeTwinTrace(twin, { step: 'b2', code: 'hallucination', cause: 'reasoning' }).score).toBeCloseTo(0.4);
    expect(gradeTwinTrace(twin, { step: 'b1', code: 'policy_violation', cause: 'regression' }).score).toBeCloseTo(0.6);
  });
  it('firstDivergence compares role, content, tool and args by position', () => {
    expect(firstDivergence(twin.trace_a, twin.trace_b)).toBe(1);
    expect(firstDivergence(twin.trace_a, [twin.trace_b[0], { ...twin.trace_a[1], id: 'zz' }])).toBe(-1);
    expect(firstDivergence(
      [{ id: 'x', role: 'tool_call', tool: 'a', args: { n: 1 } }],
      [{ id: 'y', role: 'tool_call', tool: 'a', args: { n: 2 } }],
    )).toBe(0);
  });
  it('schema parses a twin trace', () => expect(ChallengeSchema.safeParse(twin).success).toBe(true));
});

const bug: EvalBug = {
  id: 't-bug', tier: 'practitioner', type: 'eval_bug', provenance: 'hypothetical', title: 'Bug', brief: 'Find it', xp: 150, concepts: [],
  explanation: 'Hypothetical scenario. Exact string match rejects a correct answer that differs only in rounding.',
  artifact: 'grader', language: 'python',
  code_lines: ['def grade(answer, expected):', '    return answer.strip() == expected', '', 'score = mean(grade(a, e) for a, e in runs)'],
  answer: { line: 2, bug_type: 'rigid_match' },
};

describe('Spot the Eval Bug', () => {
  it('fixed bug-type list with labels', () => {
    expect(Object.keys(EVAL_BUGS)).toEqual(['leakage', 'rigid_match', 'wrong_denominator', 'missing_isolation', 'one_sided_set']);
    for (const b of Object.values(EVAL_BUGS)) expect(b.hint.length).toBeGreaterThan(20);
  });
  it('exact line and type = full marks', () => expect(gradeEvalBug(bug, { line: 2, bug_type: 'rigid_match' })).toMatchObject({ correct: true, score: 1 }));
  it('half credit each', () => {
    expect(gradeEvalBug(bug, { line: 2, bug_type: 'leakage' }).score).toBeCloseTo(0.5);
    expect(gradeEvalBug(bug, { line: 1, bug_type: 'rigid_match' }).score).toBeCloseTo(0.5);
  });
  it('schema accepts the fixture and rejects unknown bug types', () => {
    expect(ChallengeSchema.safeParse(bug).success).toBe(true);
    expect(ChallengeSchema.safeParse({ ...bug, answer: { line: 2, bug_type: 'typo' } }).success).toBe(false);
  });
});

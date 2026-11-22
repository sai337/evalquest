import type { EvalBug, JudgeBuilder, Mcq, SpotFailure, Step, TwinTrace } from './schema';

export interface Grade {
  correct: boolean;
  score: number; // 0..1
}

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

export function gradeSpotFailure(ch: SpotFailure, guess: { steps: string[]; category: string }) {
  const stepsRight = sameSet([...new Set(guess.steps)], ch.answer.steps);
  const altAccepted = (ch.answer.also_accept ?? []).includes(guess.category as never);
  const categoryRight = guess.category === ch.answer.category || altAccepted;
  const score = (stepsRight ? 0.6 : 0) + (categoryRight ? 0.4 : 0);
  return { correct: stepsRight && categoryRight, score, stepsRight, categoryRight, altAccepted };
}

export function gradeMcq(ch: Mcq, optionId: string): Grade {
  const correct = optionId === ch.answer;
  return { correct, score: correct ? 1 : 0 };
}

export interface JudgeSpec {
  criteria: string[];
  rule: 'all' | 'at_least_k';
  k?: number;
}

export function predict(checks: Record<string, boolean>, judge: JudgeSpec): 'pass' | 'fail' {
  if (judge.criteria.length === 0) return 'pass';
  const held = judge.criteria.filter((c) => checks[c]).length;
  const needed = judge.rule === 'all' ? judge.criteria.length : Math.min(judge.k ?? 1, judge.criteria.length);
  return held >= needed ? 'pass' : 'fail';
}

/** Scores a judge against human labels. "Positive" = a failure, so recall = share of real failures caught. */
export function scoreJudge(ch: JudgeBuilder, judge: JudgeSpec) {
  let tp = 0, fp = 0, tn = 0, fn = 0;
  const perSample = ch.samples.map((s) => {
    const predicted = predict(s.checks, judge);
    const human = s.human_label;
    if (predicted === 'fail' && human === 'fail') tp++;
    else if (predicted === 'fail' && human === 'pass') fp++;
    else if (predicted === 'pass' && human === 'pass') tn++;
    else fn++;
    return { id: s.id, predicted, human, agree: predicted === human };
  });
  const n = ch.samples.length;
  const agreement = (tp + tn) / n;
  const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
  const passed = agreement >= ch.target_agreement;
  return { tp, fp, tn, fn, agreement, precision, recall, passed, perSample, correct: passed, score: passed ? 1 : agreement / 2 };
}

const sameStep = (a: Step, b: Step) =>
  a.role === b.role && (a.content ?? '') === (b.content ?? '') && (a.tool ?? '') === (b.tool ?? '') && JSON.stringify(a.args ?? {}) === JSON.stringify(b.args ?? {});

/** Index of the first position where the two traces differ (step ids ignored), or -1 if one is a prefix of the other. */
export function firstDivergence(a: Step[], b: Step[]) {
  for (let i = 0; i < Math.min(a.length, b.length); i++) if (!sameStep(a[i], b[i])) return i;
  return a.length === b.length ? -1 : Math.min(a.length, b.length);
}

/** Twin Trace: step 0.4 + code 0.3 (also_accept counts) + cause 0.3. */
export function gradeTwinTrace(ch: TwinTrace, guess: { step: string; code: string; cause: string }) {
  const stepRight = guess.step === ch.answer.step;
  const altAccepted = (ch.answer.also_accept ?? []).includes(guess.code as never);
  const codeRight = guess.code === ch.answer.code || altAccepted;
  const causeRight = guess.cause === ch.answer.cause;
  const score = (stepRight ? 0.4 : 0) + (codeRight ? 0.3 : 0) + (causeRight ? 0.3 : 0);
  return { correct: stepRight && codeRight && causeRight, score, stepRight, codeRight, causeRight, altAccepted };
}

/** Spot the Eval Bug: line 0.5 + bug type 0.5. */
export function gradeEvalBug(ch: EvalBug, guess: { line: number; bug_type: string }) {
  const lineRight = guess.line === ch.answer.line;
  const typeRight = guess.bug_type === ch.answer.bug_type;
  return { correct: lineRight && typeRight, score: (lineRight ? 0.5 : 0) + (typeRight ? 0.5 : 0), lineRight, typeRight };
}

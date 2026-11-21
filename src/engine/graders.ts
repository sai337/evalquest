import type { JudgeBuilder, Mcq, SpotFailure } from './schema';

export interface Grade {
  correct: boolean;
  score: number; // 0..1
}

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

export function gradeSpotFailure(ch: SpotFailure, guess: { steps: string[]; category: string }) {
  const stepsRight = sameSet([...new Set(guess.steps)], ch.answer.steps);
  const categoryRight = guess.category === ch.answer.category;
  const score = (stepsRight ? 0.6 : 0) + (categoryRight ? 0.4 : 0);
  return { correct: stepsRight && categoryRight, score, stepsRight, categoryRight };
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

import { z } from 'zod';
import { EVAL_BUG_TYPES, FAILURE_CODES, TIERS, TWIN_CAUSES } from './taxonomy';

export const PROVENANCE = ['documented', 'benchmark', 'hypothetical'] as const;

const id = z.string().regex(/^[a-z0-9][a-z0-9-]*$/, 'use lowercase letters, digits and dashes');

const Step = z.object({
  id: z.string().min(1),
  role: z.enum(['system', 'user', 'agent', 'tool_call', 'tool_result']),
  content: z.string().optional(),
  tool: z.string().optional(),
  args: z.record(z.string(), z.unknown()).optional(),
});

const base = {
  id,
  tier: z.enum(TIERS),
  title: z.string().min(3),
  brief: z.string().min(3),
  explanation: z.string().min(40, 'explanations must teach the why (40+ chars)'),
  xp: z.number().int().positive().default(100),
  concepts: z.array(z.string()).default([]),
  hint: z.string().optional(),
  /** documented = a real incident; benchmark = from a published benchmark or paper; hypothetical = designed for practice. */
  provenance: z.enum(PROVENANCE),
  /** For documented/benchmark challenges: the title of the pack source it is anchored on. */
  source: z.string().optional(),
};

export const SpotFailureSchema = z.object({
  ...base,
  type: z.literal('spot_failure'),
  trace: z.array(Step).min(2),
  answer: z
    .object({
      steps: z.array(z.string()).min(1),
      category: z.enum(FAILURE_CODES),
      /** Other codes that are also a defensible reading of the failing step(s). */
      also_accept: z.array(z.enum(FAILURE_CODES)).default([]),
    })
    .refine((a) => !a.also_accept.includes(a.category) && new Set(a.also_accept).size === a.also_accept.length, {
      message: 'also_accept must not repeat the main category or itself',
    }),
});

export const McqSchema = z.object({
  ...base,
  type: z.literal('mcq'),
  question: z.string().min(3),
  options: z.array(z.object({ id: z.string(), text: z.string() })).min(2),
  answer: z.string(),
});

export const JudgeBuilderSchema = z.object({
  ...base,
  type: z.literal('judge_builder'),
  question: z.string().min(3),
  criteria: z.array(z.object({ id: z.string(), text: z.string() })).min(2),
  samples: z
    .array(
      z.object({
        id: z.string(),
        input: z.string().optional(),
        output: z.string(),
        checks: z.record(z.string(), z.boolean()),
        human_label: z.enum(['pass', 'fail']),
        note: z.string().optional(),
      }),
    )
    .min(4),
  target_agreement: z.number().min(0.5).max(1),
  answer: z.object({
    criteria: z.array(z.string()).min(1),
    rule: z.enum(['all', 'at_least_k']),
    k: z.number().int().positive().optional(),
  }),
});

export const TwinTraceSchema = z.object({
  ...base,
  type: z.literal('twin_trace'),
  label_a: z.string().min(2),
  label_b: z.string().min(2),
  trace_a: z.array(Step).min(2),
  trace_b: z.array(Step).min(2),
  /** step = the first step in trace_b that diverges from trace_a (a content eval checks this). */
  answer: z
    .object({ step: z.string(), code: z.enum(FAILURE_CODES), also_accept: z.array(z.enum(FAILURE_CODES)).default([]), cause: z.enum(TWIN_CAUSES) })
    .refine((a) => !a.also_accept.includes(a.code), { message: 'also_accept must not repeat the main code' }),
});

export const EvalBugSchema = z.object({
  ...base,
  type: z.literal('eval_bug'),
  artifact: z.enum(['judge_prompt', 'grader', 'harness']),
  language: z.string().default('text'),
  code_lines: z.array(z.string()).min(4),
  /** line is 1-based. */
  answer: z.object({ line: z.number().int().positive(), bug_type: z.enum(EVAL_BUG_TYPES) }),
});

export const ChallengeSchema = z.discriminatedUnion('type', [SpotFailureSchema, McqSchema, JudgeBuilderSchema, TwinTraceSchema, EvalBugSchema]);

export const PackSchema = z.object({
  id,
  title: z.string(),
  domain: z.string(),
  icon: z.string(),
  summary: z.string(),
  /** References the pack is grounded on. verified = the source was opened and the claim checked. */
  sources: z.array(z.object({ title: z.string().min(3), url: z.string().url(), verified: z.boolean() })).default([]),
  agent: z.object({
    name: z.string(),
    description: z.string(),
    tools: z.array(z.string()).min(1),
    policies: z.array(z.string()).default([]),
  }),
  challenges: z.array(ChallengeSchema).min(3),
});

export type Step = z.infer<typeof Step>;
export type SpotFailure = z.infer<typeof SpotFailureSchema>;
export type Mcq = z.infer<typeof McqSchema>;
export type JudgeBuilder = z.infer<typeof JudgeBuilderSchema>;
export type TwinTrace = z.infer<typeof TwinTraceSchema>;
export type EvalBug = z.infer<typeof EvalBugSchema>;
export type Challenge = z.infer<typeof ChallengeSchema>;
export type Pack = z.infer<typeof PackSchema>;

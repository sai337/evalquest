import { z } from 'zod';
import { FAILURE_CODES, TIERS } from './taxonomy';

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
};

export const SpotFailureSchema = z.object({
  ...base,
  type: z.literal('spot_failure'),
  trace: z.array(Step).min(2),
  answer: z.object({ steps: z.array(z.string()).min(1), category: z.enum(FAILURE_CODES) }),
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

export const ChallengeSchema = z.discriminatedUnion('type', [SpotFailureSchema, McqSchema, JudgeBuilderSchema]);

export const PackSchema = z.object({
  id,
  title: z.string(),
  domain: z.string(),
  icon: z.string(),
  summary: z.string(),
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
export type Challenge = z.infer<typeof ChallengeSchema>;
export type Pack = z.infer<typeof PackSchema>;

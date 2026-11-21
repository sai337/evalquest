export const FAILURES = {
  hallucination: { label: 'Hallucination', hint: 'States facts not supported by tools, context or reality' },
  wrong_tool: { label: 'Wrong tool', hint: 'Calls the wrong tool, or no tool when one was needed' },
  wrong_args: { label: 'Wrong arguments', hint: 'Right tool, wrong or missing arguments' },
  policy_violation: { label: 'Policy violation', hint: 'Breaks a stated business or safety policy' },
  missed_escalation: { label: 'Missed escalation', hint: 'Should have handed off to a human and did not' },
  privacy_leak: { label: 'Privacy leak', hint: 'Exposes personal or sensitive data to the wrong party' },
  incomplete_task: { label: 'Incomplete / false success', hint: 'Stops early, or claims success that did not happen' },
  loop_or_inefficiency: { label: 'Loop / inefficiency', hint: 'Repeats steps or wastes calls' },
  prompt_injection_followed: { label: 'Prompt injection followed', hint: 'Obeys instructions hidden in tool output or content' },
  tone_or_format: { label: 'Tone / format', hint: 'Right content, wrong tone, format or language' },
} as const;

export type FailureCode = keyof typeof FAILURES;
export const FAILURE_CODES = Object.keys(FAILURES) as [FailureCode, ...FailureCode[]];

export const TIERS = ['beginner', 'practitioner', 'advanced', 'pro', 'sme'] as const;
export type Tier = (typeof TIERS)[number];

export const TIER_INFO: Record<Tier, { label: string; blurb: string; color: string }> = {
  beginner: { label: 'Beginner', blurb: 'Spot failures. Learn the words.', color: '#34d399' },
  practitioner: { label: 'Practitioner', blurb: 'Rubrics, golden sets, LLM-as-judge.', color: '#60a5fa' },
  advanced: { label: 'Advanced', blurb: 'Trajectories, tool calls, RAG, multi-turn.', color: '#a78bfa' },
  pro: { label: 'Pro', blurb: 'Judge calibration, drift, CI gates.', color: '#f59e0b' },
  sme: { label: 'SME', blurb: 'Design eval strategy for a whole platform.', color: '#f43f5e' },
};

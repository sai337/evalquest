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
  unapproved_action: { label: 'Unapproved action', hint: 'Takes an irreversible, destructive or binding action without required consent or approval' },
  spec_gaming: { label: 'Specification gaming', hint: 'Changes its own constraints, tests, limits or grader instead of doing the task' },
  coordination_failure: { label: 'Coordination failure', hint: "Ignores, withholds or contradicts another agent's or user's input, or says one thing and does another" },
  misrecognition: { label: 'Misrecognition', hint: 'Mishears, misreads or misparses the input (speech, screen, document)' },
  unsafe_output: { label: 'Unsafe output', hint: 'Emits content that is dangerous when rendered or executed (auto-fetched image URLs, links carrying data, scripts)' },
} as const;

export type FailureCode = keyof typeof FAILURES;
export const FAILURE_CODES = Object.keys(FAILURES) as [FailureCode, ...FailureCode[]];

/** Spot the Eval Bug: the bug classes the mechanic teaches. */
export const EVAL_BUGS = {
  leakage: { label: 'Leakage', hint: 'The answer, the label or test data reaches the system or the judge being graded' },
  rigid_match: { label: 'Rigid match', hint: 'Exact string or path matching fails valid answers that differ in form (rounding, order, an alternative route)' },
  wrong_denominator: { label: 'Wrong denominator', hint: 'The rate is divided by the wrong count (attempts vs tasks, only the cases that ran, a filtered subset)' },
  missing_isolation: { label: 'Missing isolation', hint: 'Trials share state (files, caches, memory, accounts), so one run changes the next' },
  one_sided_set: { label: 'One-sided set', hint: 'The test set only checks one direction (only attacks, only refusals) so over- or under-triggering goes unseen' },
} as const;
export type EvalBugType = keyof typeof EVAL_BUGS;
export const EVAL_BUG_TYPES = Object.keys(EVAL_BUGS) as [EvalBugType, ...EvalBugType[]];

/** Twin Trace: why the two runs diverged. */
export const TWIN_CAUSES = ['reasoning', 'coordination', 'regression'] as const;
export const TWIN_CAUSE_INFO: Record<(typeof TWIN_CAUSES)[number], string> = {
  reasoning: 'Same inputs, the agent reasoned or acted differently on its own',
  coordination: 'Another agent or the user supplied something the agent mishandled',
  regression: 'A change to the model, prompt or tools broke behaviour that used to work',
};

export const TIERS = ['beginner', 'practitioner', 'advanced', 'pro', 'sme'] as const;
export type Tier = (typeof TIERS)[number];

export const TIER_INFO: Record<Tier, { label: string; blurb: string; color: string }> = {
  beginner: { label: 'Beginner', blurb: 'Spot failures. Learn the words.', color: '#34d399' },
  practitioner: { label: 'Practitioner', blurb: 'Rubrics, golden sets, LLM-as-judge.', color: '#60a5fa' },
  advanced: { label: 'Advanced', blurb: 'Trajectories, tool calls, RAG, multi-turn.', color: '#a78bfa' },
  pro: { label: 'Pro', blurb: 'Judge calibration, drift, CI gates.', color: '#f59e0b' },
  sme: { label: 'SME', blurb: 'Design eval strategy for a whole platform.', color: '#f43f5e' },
};

/**
 * Red Team Sim: a deterministic finite state machine stands in for the agent.
 * deliver → filter → obey → act (per tool call) → goal.
 * The simulated agent obeys any instruction it can read in untrusted content: that is the vulnerability being taught.
 * Scoring follows AgentDojo's rule: a defence counts only if the attack fails AND every utility task still passes.
 */
import type { Defence, RedTeam } from './schema';

export interface Attack { channel: string; instruction: string; disguise: string }
export type SimState = 'deliver' | 'filter' | 'obey' | 'act' | 'goal' | 'end';
export interface LogLine { state: SimState; ok: boolean; msg: string }

type UtilityTask = RedTeam['utility_tasks'][number];

const b64 = (s: string) => {
  let bin = '';
  for (const byte of new TextEncoder().encode(s)) bin += String.fromCharCode(byte);
  return btoa(bin);
};

/** What the attacker plants (`shown`, which is all a filter sees) and what the agent understands (`decoded`). */
export function renderPayload(ch: RedTeam, a: Attack) {
  const ins = ch.tiles.instruction.find((x) => x.id === a.instruction);
  const dis = ch.tiles.disguise.find((x) => x.id === a.disguise);
  if (!ins || !dis) return { shown: '', decoded: '' };
  return { shown: dis.template.replace('{x}', dis.encoded ? b64(ins.text) : ins.text), decoded: dis.template.replace('{x}', ins.text) };
}

const active = (ch: RedTeam, extra?: Defence) => (extra ? [...ch.simulator.defences, extra] : ch.simulator.defences);
const filterHit = (defs: Defence[], text: string) => {
  const t = text.toLowerCase();
  for (const d of defs) if (d.rule.kind === 'content_filter') { const p = d.rule.patterns.find((x) => t.includes(x.toLowerCase())); if (p) return { d, p }; }
  return null;
};
const channelBlocked = (defs: Defence[], channel: string) => defs.find((d) => d.rule.kind === 'block_channel' && d.rule.channels.includes(channel));
const toolDenied = (defs: Defence[], tool: string) => defs.find((d) => d.rule.kind === 'deny_tools' && d.rule.tools.includes(tool));
const toolGated = (defs: Defence[], tool: string) => defs.find((d) => d.rule.kind === 'approval' && d.rule.tools.includes(tool));

/** Runs one attack through the FSM with the baseline defences plus an optional extra one. */
export function runAttack(ch: RedTeam, a: Attack, extra?: Defence) {
  const defs = active(ch, extra);
  const log: LogLine[] = [];
  const effects: string[] = [];
  const done = (reached: boolean) => ({ reached, log, effects });
  const channel = ch.tiles.channel.find((x) => x.id === a.channel);
  const ins = ch.tiles.instruction.find((x) => x.id === a.instruction);
  if (!channel || !ins) return done(false);

  // deliver: does the payload land somewhere the agent reads during the user's task?
  if (!channel.reaches_agent) { log.push({ state: 'deliver', ok: false, msg: `${channel.label}: never read during "${ch.simulator.task}". ${channel.note ?? ''}`.trim() }); return done(false); }
  const blocked = channelBlocked(defs, channel.id);
  if (blocked) { log.push({ state: 'deliver', ok: false, msg: `${blocked.label}: the agent no longer reads ${channel.label}.` }); return done(false); }
  log.push({ state: 'deliver', ok: true, msg: `Planted in ${channel.label}; the agent reads it while doing "${ch.simulator.task}".` });

  // filter: content filters see only the visible text
  const p = renderPayload(ch, a);
  const hit = filterHit(defs, p.shown);
  if (hit) { log.push({ state: 'filter', ok: false, msg: `${hit.d.label} matched "${hit.p}" and dropped the content.` }); return done(false); }
  log.push({ state: 'filter', ok: true, msg: defs.some((d) => d.rule.kind === 'content_filter') ? 'Content filters found nothing to block.' : 'No content filter in place.' });

  // obey: the simulated agent follows readable instructions in untrusted content
  log.push({ state: 'obey', ok: true, msg: `The agent treats the text as an instruction: "${ins.text}"` });

  // act: each tool call is checked against tool defences
  for (const step of ins.actions) {
    const denied = toolDenied(defs, step.tool);
    if (denied) { log.push({ state: 'act', ok: false, msg: `${step.tool}: blocked by ${denied.label}.` }); return done(false); }
    const gated = toolGated(defs, step.tool);
    if (gated) { log.push({ state: 'act', ok: false, msg: `${step.tool}: ${gated.label} asked the user, who never requested it and declined.` }); return done(false); }
    effects.push(step.effect);
    log.push({ state: 'act', ok: true, msg: `${step.tool} ran → ${step.effect}` });
  }

  const reached = effects.includes(ch.simulator.goal_effect);
  log.push(reached ? { state: 'goal', ok: true, msg: `Goal reached: ${ch.simulator.goal}.` } : { state: 'end', ok: false, msg: `The chain ran but never produced "${ch.simulator.goal_effect}".` });
  return done(reached);
}

/** A utility task is the user's own request: it passes if every content read and tool call it needs survives the defences. */
export function runUtility(ch: RedTeam, task: UtilityTask, extra?: Defence) {
  const defs = active(ch, extra);
  const fail = (reason: string) => ({ id: task.id, label: task.label, ok: false, reason });
  if (task.channel) {
    const b = channelBlocked(defs, task.channel);
    if (b) return fail(`${b.label} stops the agent reading the content it needs.`);
  }
  if (task.content) {
    const hit = filterHit(defs, task.content);
    if (hit) return fail(`${hit.d.label} matched "${hit.p}" in legitimate content (false positive).`);
  }
  for (const tool of task.actions) {
    const d = toolDenied(defs, tool);
    if (d) return fail(`${d.label} removes ${tool}, which this task needs.`);
  }
  return { id: task.id, label: task.label, ok: true, reason: 'Passes (the user approves actions they asked for).' };
}

/** Every tile combination that reaches the goal against the given defences. */
export function successfulAttacks(ch: RedTeam, extra?: Defence): Attack[] {
  const out: Attack[] = [];
  for (const c of ch.tiles.channel) for (const i of ch.tiles.instruction) for (const d of ch.tiles.disguise) {
    const a = { channel: c.id, instruction: i.id, disguise: d.id };
    if (runAttack(ch, a, extra).reached) out.push(a);
  }
  return out;
}

/** A defence must stop every attack that wins at baseline (not just one) and keep every utility task passing. */
export function evaluateDefence(ch: RedTeam, defenceId: string) {
  const d = ch.defence_options.find((x) => x.id === defenceId);
  const winners = successfulAttacks(ch);
  const stillOpen = d ? winners.filter((a) => runAttack(ch, a, d).reached) : winners;
  const utility = ch.utility_tasks.map((t) => runUtility(ch, t, d));
  const blocksAll = !!d && stillOpen.length === 0;
  const utilityOk = utility.every((u) => u.ok);
  return { blocksAll, stillOpen, utility, utilityOk, passed: blocksAll && utilityOk };
}

/** Attack 0.5 (reaches goal_state at baseline) + defence 0.5 (AgentDojo's utility-plus-attack rule). */
export function gradeRedTeam(ch: RedTeam, guess: { attack: Attack; defence: string }) {
  const attackRun = runAttack(ch, guess.attack);
  const defence = evaluateDefence(ch, guess.defence);
  const score = (attackRun.reached ? 0.5 : 0) + (defence.passed ? 0.5 : 0);
  return { correct: attackRun.reached && defence.passed, score, attackOk: attackRun.reached, defenceOk: defence.passed, attackRun, defence };
}

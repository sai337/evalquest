/**
 * Content evals: every scenario pack must pass these before it can merge.
 * They are the "eval of the evals" — if a pack fails here, fix the pack, never the test.
 */
import { describe, expect, it } from 'vitest';
import { PackSchema, type JudgeBuilder, type Pack } from '../src/engine/schema';
import { rawPackFiles } from '../src/engine/packs';
import { firstDivergence, scoreJudge } from '../src/engine/graders';
import { evaluateDefence, runAttack, runUtility, successfulAttacks } from '../src/engine/redteam';
import { GLOSSARY } from '../src/engine/glossary';

const files = Object.entries(rawPackFiles);
const parsed: { file: string; pack: Pack }[] = [];

describe('pack files', () => {
  it('at least one pack exists', () => expect(files.length).toBeGreaterThan(0));

  for (const [file, data] of files) {
    it(`${file} matches the pack schema`, () => {
      const r = PackSchema.safeParse(data);
      if (!r.success) throw new Error(r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n'));
      parsed.push({ file, pack: r.data });
    });
  }
});

describe('content evals', () => {
  it('pack ids and challenge ids are globally unique', () => {
    const packIds = parsed.map((p) => p.pack.id);
    expect(new Set(packIds).size).toBe(packIds.length);
    const ids = parsed.flatMap((p) => p.pack.challenges.map((c) => c.id));
    const dupes = ids.filter((x, i) => ids.indexOf(x) !== i);
    expect(dupes).toEqual([]);
  });

  it('challenge ids start with the pack id', () => {
    for (const { pack } of parsed)
      for (const c of pack.challenges) expect(c.id.startsWith(pack.id + '-'), `${c.id} should start with ${pack.id}-`).toBe(true);
  });

  it('every concept referenced exists in the glossary', () => {
    for (const { pack } of parsed)
      for (const c of pack.challenges)
        for (const k of c.concepts) expect(GLOSSARY[k], `${c.id}: unknown concept "${k}"`).toBeDefined();
  });

  it('Trace Detective: answer steps exist, step ids unique, tool calls use the agent’s tools', () => {
    for (const { pack } of parsed)
      for (const c of pack.challenges) {
        if (c.type !== 'spot_failure') continue;
        const ids = c.trace.map((s) => s.id);
        expect(new Set(ids).size, `${c.id}: duplicate step ids`).toBe(ids.length);
        for (const s of c.answer.steps) expect(ids, `${c.id}: answer step ${s} not in trace`).toContain(s);
        for (const s of c.trace)
          if (s.role === 'tool_call') expect(pack.agent.tools, `${c.id}: tool ${s.tool} not declared`).toContain(s.tool);
        expect(c.answer.steps.length, `${c.id}: an answer covering most of the trace is not a puzzle`).toBeLessThan(ids.length);
      }
  });

  it('Eval Call: answer is one of the options, option ids unique, 3+ options', () => {
    for (const { pack } of parsed)
      for (const c of pack.challenges) {
        if (c.type !== 'mcq') continue;
        const ids = c.options.map((o) => o.id);
        expect(new Set(ids).size).toBe(ids.length);
        expect(ids, `${c.id}: answer not an option`).toContain(c.answer);
        expect(ids.length, `${c.id}: needs 3+ options`).toBeGreaterThanOrEqual(3);
      }
  });

  describe('Judge Builder solvability', () => {
    const judges = () =>
      parsed.flatMap(({ pack }) => pack.challenges.filter((c): c is JudgeBuilder => c.type === 'judge_builder'));

    it('every sample labels every criterion', () => {
      for (const c of judges()) {
        const keys = c.criteria.map((x) => x.id).sort();
        for (const s of c.samples) expect(Object.keys(s.checks).sort(), `${c.id}/${s.id}`).toEqual(keys);
      }
    });

    it('has both passing and failing human labels', () => {
      for (const c of judges()) {
        const labels = new Set(c.samples.map((s) => s.human_label));
        expect(labels.size, `${c.id}: needs pass and fail samples`).toBe(2);
      }
    });

    it('the reference judge reaches the target agreement', () => {
      for (const c of judges()) {
        for (const k of c.answer.criteria) expect(c.criteria.map((x) => x.id), `${c.id}: unknown criterion ${k}`).toContain(k);
        const r = scoreJudge(c, c.answer);
        expect(r.agreement, `${c.id}: reference judge only reaches ${r.agreement}`).toBeGreaterThanOrEqual(c.target_agreement);
      }
    });

    it('is not trivial: the always-pass judge and the use-every-check judge both fall short', () => {
      for (const c of judges()) {
        expect(scoreJudge(c, { criteria: [], rule: 'all' }).passed, `${c.id}: always-pass judge wins`).toBe(false);
        const everything = scoreJudge(c, { criteria: c.criteria.map((x) => x.id), rule: 'all' });
        expect(everything.passed, `${c.id}: ticking every box wins — add a tempting check that humans don't care about`).toBe(false);
      }
    });
  });

  it('Twin Trace: same task, declared tools, and the answer is the computed first divergence', () => {
    for (const { pack } of parsed)
      for (const c of pack.challenges) {
        if (c.type !== 'twin_trace') continue;
        for (const t of [c.trace_a, c.trace_b]) {
          const ids = t.map((s) => s.id);
          expect(new Set(ids).size, `${c.id}: duplicate step ids`).toBe(ids.length);
          for (const s of t) if (s.role === 'tool_call') expect(pack.agent.tools, `${c.id}: tool ${s.tool} not declared`).toContain(s.tool);
        }
        expect(c.trace_b[0].content, `${c.id}: both runs must start from the same task`).toBe(c.trace_a[0].content);
        const i = firstDivergence(c.trace_a, c.trace_b);
        expect(i, `${c.id}: the traces never diverge`).toBeGreaterThan(0);
        expect(c.answer.step, `${c.id}: the first divergence is ${c.trace_b[i]?.id}`).toBe(c.trace_b[i]?.id);
      }
  });

  it('Spot the Eval Bug: the answer line exists and is not blank', () => {
    for (const { pack } of parsed)
      for (const c of pack.challenges) {
        if (c.type !== 'eval_bug') continue;
        const line = c.code_lines[c.answer.line - 1];
        expect(line, `${c.id}: answer line ${c.answer.line} is out of range`).toBeDefined();
        expect(line.trim().length, `${c.id}: answer line is blank`).toBeGreaterThan(0);
      }
  });


  describe('Red Team Sim', () => {
    const sims = () => parsed.flatMap(({ pack }) => pack.challenges.filter((c) => c.type === 'red_team').map((c) => ({ pack, c: c as Extract<typeof c, { type: 'red_team' }> })));
    const uniq = (xs: string[]) => new Set(xs).size === xs.length;

    it('ids are unique and every tool, channel and tile reference is declared', () => {
      for (const { pack, c } of sims()) {
        for (const t of c.simulator.tools) expect(pack.agent.tools, `${c.id}: simulator tool ${t} not in agent.tools`).toContain(t);
        const tools = c.simulator.tools;
        const channels = c.tiles.channel.map((x) => x.id);
        for (const k of ['channel', 'instruction', 'disguise'] as const) expect(uniq(c.tiles[k].map((x) => x.id)), `${c.id}: duplicate ${k} ids`).toBe(true);
        expect(uniq([...c.simulator.defences, ...c.defence_options].map((d) => d.id)), `${c.id}: duplicate defence ids`).toBe(true);
        for (const i of c.tiles.instruction) for (const a of i.actions) expect(tools, `${c.id}/${i.id}: tool ${a.tool}`).toContain(a.tool);
        for (const u of c.utility_tasks) {
          for (const t of u.actions) expect(tools, `${c.id}/${u.id}: tool ${t}`).toContain(t);
          if (u.channel) expect(channels, `${c.id}/${u.id}: channel ${u.channel}`).toContain(u.channel);
        }
        for (const d of [...c.simulator.defences, ...c.defence_options]) {
          if (d.rule.kind === 'block_channel') for (const x of d.rule.channels) expect(channels, `${c.id}/${d.id}`).toContain(x);
          if (d.rule.kind === 'deny_tools' || d.rule.kind === 'approval') for (const x of d.rule.tools) expect(tools, `${c.id}/${d.id}`).toContain(x);
        }
        expect(c.tiles.instruction.some((i) => i.actions.some((a) => a.effect === c.simulator.goal_effect)), `${c.id}: no instruction can produce the goal`).toBe(true);
      }
    });

    it('the declared attack reaches the goal at baseline, and the attack is a puzzle (some combos fail)', () => {
      for (const { c } of sims()) {
        expect(runAttack(c, c.answer.attack).reached, `${c.id}: declared attack does not reach ${c.simulator.goal_effect}`).toBe(true);
        const total = c.tiles.channel.length * c.tiles.instruction.length * c.tiles.disguise.length;
        expect(successfulAttacks(c).length, `${c.id}: every combination wins, so there is nothing to work out`).toBeLessThanOrEqual(total / 2);
      }
    });

    it('baseline utility tasks pass, so a broken task is always the defence’s fault', () => {
      for (const { c } of sims()) for (const u of c.utility_tasks) expect(runUtility(c, u).ok, `${c.id}/${u.id}: fails with no new defence`).toBe(true);
    });

    it('exactly one defence option passes (AgentDojo rule), and it is the declared one', () => {
      for (const { c } of sims()) {
        const passing = c.defence_options.filter((d) => evaluateDefence(c, d.id).passed).map((d) => d.id);
        expect(passing, `${c.id}: passing defences`).toEqual([c.answer.defence]);
      }
    });

    it('teaches the utility half: one wrong option blocks every attack but breaks a utility task', () => {
      for (const { c } of sims()) {
        const overBlock = c.defence_options.some((d) => { const e = evaluateDefence(c, d.id); return e.blocksAll && !e.utilityOk; });
        expect(overBlock, `${c.id}: add a tempting defence that over-blocks`).toBe(true);
      }
    });
  });

  it('provenance: every pack lists at least one https source', () => {
    for (const { pack } of parsed) {
      expect(pack.sources.length, `${pack.id}: add at least one source`).toBeGreaterThan(0);
      for (const s of pack.sources) expect(s.url, `${pack.id}: ${s.title}`).toMatch(/^https:\/\//);
    }
  });

  it('provenance: hypothetical challenges say so in the explanation', () => {
    for (const { pack } of parsed)
      for (const c of pack.challenges)
        if (c.provenance === 'hypothetical') expect(c.explanation, `${c.id}: say "hypothetical" in the explanation`).toMatch(/hypothetical/i);
  });

  it('provenance: documented and benchmark challenges name their anchor in the pack sources', () => {
    for (const { pack } of parsed)
      for (const c of pack.challenges) {
        if (c.provenance === 'hypothetical') continue;
        expect(c.source, `${c.id}: set source to a pack source title`).toBeDefined();
        expect(pack.sources.map((s) => s.title), `${c.id}: unknown source "${c.source}"`).toContain(c.source);
      }
  });

  it('every pack has Beginner and Practitioner content', () => {
    for (const { pack } of parsed) {
      const tiers = new Set(pack.challenges.map((c) => c.tier));
      expect(tiers.has('beginner'), `${pack.id}: no beginner challenge`).toBe(true);
      expect(tiers.has('practitioner'), `${pack.id}: no practitioner challenge`).toBe(true);
    }
  });
});

describe('pack template', () => {
  it('packs/_template.yaml is itself a valid pack, so contributors start from green', async () => {
    const tpl = (await import('../packs/_template.yaml')).default;
    const r = PackSchema.safeParse(tpl);
    expect(r.success, r.success ? '' : JSON.stringify(r.error.issues)).toBe(true);
  });
});

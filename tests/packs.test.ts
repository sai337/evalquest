/**
 * Content evals: every scenario pack must pass these before it can merge.
 * They are the "eval of the evals" — if a pack fails here, fix the pack, never the test.
 */
import { describe, expect, it } from 'vitest';
import { PackSchema, type JudgeBuilder, type Pack } from '../src/engine/schema';
import { rawPackFiles } from '../src/engine/packs';
import { scoreJudge } from '../src/engine/graders';
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

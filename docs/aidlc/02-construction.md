# Phase 2 — Construction (how it's built)

## Plan executed (Phase 1 scope)

| Unit | Built | Verified by |
|---|---|---|
| U1 Engine | `src/engine/` — taxonomy, Zod schema, pack loader, graders, progress | `tests/graders.test.ts`, `tests/progress.test.ts` |
| U2 UI | `src/ui/` — map + ladder, pack page, Trace Detective, Eval Call, Judge Builder, glossary | Headless-browser run of each challenge type, no console errors |
| U3 Content | `packs/` — e-commerce, banking, contact center (18 challenges) | `tests/packs.test.ts` content evals |
| U4 Quality | GitHub Actions: tests, type-check, build, bundle budget | CI on every push and PR |

## Test strategy

1. **Grader unit tests (written first).** Exact scoring rules: partial credit, step-set matching, confusion-matrix maths, `at_least_k`.
2. **Content evals.** Each pack is checked for schema, unique IDs, valid answers, declared tools, known glossary terms, and Judge Builder solvability:
   - the reference judge reaches `target_agreement`;
   - the always-pass judge falls short (labels aren't trivial);
   - the tick-every-box judge falls short (there is a real trap).
3. **Mutation check.** A deliberately broken pack must fail the content evals. It did: *"reference judge only reaches 0.5"*.
4. **UI smoke test.** Headless Chromium plays one challenge of each type on desktop and mobile.

## Key build choices

- Grading is deterministic and runs in the browser. Judge Builder samples carry hidden per-check truth values, so a player's judge is simulated exactly, with no model calls.
- Failed attempts are not stored, so the map only shows real progress.
- Judge Builder gives full XP within 3 runs and half after that: iterating is the skill being taught, not blind guessing.

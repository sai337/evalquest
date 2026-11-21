# EvalQuest — project rules for AI coding assistants

## What this is
A static web game that teaches LLM/agent evals from beginner to SME. Content lives in `packs/*.yaml`; the engine is in `src/engine`; the UI is in `src/ui`. Process docs (AI-DLC) are in `docs/aidlc/`.

## Commands
- `npm run dev` — local dev server
- `npm test` — grader unit tests + content evals (must pass before every commit)
- `npm run build` — type-check and production build
- `npm run lint:packs` — content evals only

## Rules
1. Tests first for engine changes: add or change a test in `tests/`, then the code.
2. Never weaken a content eval to make a pack pass. Fix the pack.
3. Every challenge needs an `explanation` that teaches the *why*, not just the answer.
4. Use only failure codes from `src/engine/taxonomy.ts`.
5. Judge Builder challenges: the reference judge must reach `target_agreement`, and at least one tempting wrong judge should fall short.
6. No backend, no analytics, no API keys in the default build.
7. Keep dependencies minimal and mainstream; new dependencies need a line in `docs/DECISIONS.md`.
8. Git: commits are authored as `sai337 <sai.devop@gmail.com>`. No AI co-author trailers or session links in commits, PRs or files.
9. Update `STATUS.md` at each milestone.

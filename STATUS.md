# Status

**Updated:** 2026-11-21 · **Version:** 0.4

## Live
- Game: https://evalquest-livid.vercel.app (auto-deploys from `main`)
- Optional backend: Supabase project `evalquest` (us-east-1) for GitHub sign-in, sync and leaderboard
- CI: tests + content evals + type-check + build + bundle budget on every push and PR

## Done
- v0.1: engine, 3 graders, 3 packs, Beginner + Practitioner, content evals, CI, docs
- v0.2: 6 new packs (insurance, travel, coding agent, SRE/NOC, HR, RAG) → 9 packs, 48 challenges; Advanced tier live;
  hints (−25% XP), daily puzzle, XP/rank-up toasts, tier pages, compact failure picker, share-my-rank, reset;
  optional Supabase sign-in/sync/leaderboard with RLS; 44 tests
- v0.3 (Phase 0 of the coverage roadmap): pack `sources` + per-challenge `provenance`/`source` with content evals;
  `also_accept`; 5 new failure codes (15 total) with glossary entries; optional confidence pick + Brier score +
  calibration curve; review deck (1/3/7 days); 75% mastery gating with no-XP preview; Practice page; 73 tests
- v0.4 (Phase 1, M2): Twin Trace + Spot the Eval Bug mechanics; 11 documented/hypothetical extension challenges in
  coding, e-commerce, travel, contact center and RAG → 9 packs, 59 challenges; 85 tests

## Owner action needed
- Turn on GitHub login (one time): create a GitHub OAuth app and paste its ID/secret into Supabase → Auth → Providers → GitHub;
  set Site URL to the game URL. Until then the Sign in button shows "provider not enabled".

## Next
**Phase 1** of the roadmap (in progress): M2 done. Next, M3: Red Team Sim mechanic + packs `mcp-data-agent`,
`inbox-assistant`, `computer-use` (see the Phase 1 tables in docs/research/coverage-expansion.md).

Roadmap source: [docs/research/coverage-expansion.md](docs/research/coverage-expansion.md) (Nov 2026 deep research: 16 new packs, 11 mechanics, 5 failure codes, Pro exam, SME capstone, 5 phases).

1. Pack Forge (U5b): self-improving pack generator → content evals + rubric judge → `forge/LESSONS.md` → PR
2. Pro tier: judge calibration (Cohen's κ), drift, CI release gates
3. More packs: healthcare admin, legal review, sales SDR, education tutor, voice agent, computer-use agent

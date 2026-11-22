# Status

**Updated:** 2026-11-21 · **Version:** 0.5

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
- v0.5 (Phase 1, M3, Phase 1 complete): Red Team Sim mechanic (`red_team`: deterministic FSM deliver → filter → obey → act → goal;
  attack 0.5 + defence 0.5 under AgentDojo's utility-plus-attack rule; content evals prove the declared attack, exactly one
  passing defence and a tempting over-blocking defence); packs `mcp-data-agent`, `inbox-assistant` (intent-alignment Judge
  Builder), `computer-use` (rigid-path Spot the Eval Bug); first 3 Pro challenges; ecommerce-b4/p4/p5 tightened against
  re-checked retail sources → 12 packs, 74 challenges; 111 tests; 161 KB gzipped

## Owner action needed
- Turn on GitHub login (one time): create a GitHub OAuth app and paste its ID/secret into Supabase → Auth → Providers → GitHub;
  set Site URL to the game URL. Until then the Sign in button shows "provider not enabled".

## Next
**Phase 1 is done** (M2 + M3). Next, Phase 2 of the roadmap (statistics and judge calibration: Label Bench, Held-out
Judge, Judge Calibrator, Sample Sizer, A/B Readout; SOC and research-agent packs). See docs/research/coverage-expansion.md.

Open items: re-open the Spider 2.0 leaderboard and the OSWorld 85% claim and flip `verified` only if they check out
(both labelled unverified in the packs).

Roadmap source: [docs/research/coverage-expansion.md](docs/research/coverage-expansion.md) (Nov 2026 deep research: 16 new packs, 11 mechanics, 5 failure codes, Pro exam, SME capstone, 5 phases).

1. Pack Forge (U5b): self-improving pack generator → content evals + rubric judge → `forge/LESSONS.md` → PR
2. Pro tier: judge calibration (Cohen's κ), drift, CI release gates
3. More packs: healthcare admin, legal review, sales SDR, education tutor, voice agent, computer-use agent

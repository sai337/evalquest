# Status

**Updated:** 2026-11-21 · **Version:** 0.2

## Live
- Game: https://evalquest-livid.vercel.app (auto-deploys from `main`)
- Optional backend: Supabase project `evalquest` (us-east-1) for GitHub sign-in, sync and leaderboard
- CI: tests + content evals + type-check + build + bundle budget on every push and PR

## Done
- v0.1: engine, 3 graders, 3 packs, Beginner + Practitioner, content evals, CI, docs
- v0.2: 6 new packs (insurance, travel, coding agent, SRE/NOC, HR, RAG) → 9 packs, 48 challenges; Advanced tier live;
  hints (−25% XP), daily puzzle, XP/rank-up toasts, tier pages, compact failure picker, share-my-rank, reset;
  optional Supabase sign-in/sync/leaderboard with RLS; 44 tests

## Owner action needed
- Turn on GitHub login (one time): create a GitHub OAuth app and paste its ID/secret into Supabase → Auth → Providers → GitHub;
  set Site URL to the game URL. Until then the Sign in button shows "provider not enabled".

## Next
1. Pack Forge (U5b): self-improving pack generator → content evals + rubric judge → `forge/LESSONS.md` → PR
2. Pro tier: judge calibration (Cohen's κ), drift, CI release gates
3. More packs: healthcare admin, legal review, sales SDR, education tutor, voice agent, computer-use agent

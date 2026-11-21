# Phase 3 — Operations (ship, watch, improve)

## Deploy

- **Host:** Vercel, static build (`npm run build` → `dist/`). Every merge to `main` redeploys; every PR gets a preview URL.
- **Self-host:** any static host works (GitHub Pages, S3 + CloudFront, Nginx). No server, no secrets.

## Quality gates (CI)

| Gate | Blocks merge when |
|---|---|
| Grader tests | Scoring logic changes behaviour unexpectedly |
| Content evals | A pack is invalid, unsolvable or trivial |
| Type-check + build | Code doesn't compile |
| Bundle budget | JS > 300 KB gzipped |

## Improve loop

1. Players report unclear or wrong challenges through the *Challenge feedback* issue template.
2. Each report becomes either a content fix or a new rule in the content evals, so the same class of mistake can't merge again.
3. **Pack Forge (unit U5b, next):** an agent drafts new packs, the content evals plus a rubric judge grade them, failures are written to `forge/LESSONS.md`, the next run reads those lessons, and every draft arrives as a PR for human review.

## Privacy

No analytics. Progress is stored in the player's browser (`localStorage`). Players can optionally sign in with GitHub (Supabase Auth) to sync across devices and appear on the leaderboard; only GitHub username, avatar, XP and per-challenge best scores are stored, protected by row-level security, and players can hide themselves from the board.

## Optional backend (Supabase)

- Schema: `supabase/migrations/0001_players.sql` (table `players`, trigger that takes the username from the GitHub login, RLS own-row policies, `get_leaderboard` RPC).
- Config: `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (browser-safe) in Vercel env vars. Without them, sign-in and the board are hidden.
- One-time owner setup: GitHub OAuth app → Supabase Auth GitHub provider; Site URL and redirect URLs in Supabase Auth settings.

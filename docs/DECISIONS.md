# Decisions and dependencies

| Date | Decision | Why |
|---|---|---|
| 2026-11-20 | Build with AI-DLC (Inception → Construction → Operations) plus eval-driven content gates | Visible design trail; the game's own content is evaluated the way it teaches |
| 2026-11-20 | Static site, deterministic in-browser grading | Free, private, no API keys, forkable |
| 2026-11-20 | Launch with 3 deep packs, grow via community packs | Quality first; packs are one YAML file |
| 2026-11-20 | Add the Pack Forge self-improving content loop as the next unit | Generate → evaluate → learn → human-reviewed PR |
| 2026-11-21 | Optional Supabase backend: GitHub sign-in, cross-device sync, public leaderboard (owner's choice) | Players asked for a real scoreboard; core game still works with no backend. Stores only GitHub username, avatar, XP, per-challenge best scores and a leaderboard opt-in. RLS limits writes to your own row; the leaderboard RPC exposes only username, avatar, XP and solved count. Scores are graded client-side, so the board is bragging rights, not certification. |
| 2026-11-21 | Advanced tier opened; 6 new packs (insurance, travel, coding agent, SRE/NOC, HR, RAG) | Breadth of real agentic use cases with Advanced topics: pass^k, multi-turn, reward hacking, self-improving loops, judge bias, retrieval vs generation |

## Dependencies (all mainstream, latest at time of adding, `npm audit`: 0 vulnerabilities)

| Package | Why |
|---|---|
| react, react-dom | UI |
| zod | Pack schema validation with readable errors |
| vite, @vitejs/plugin-react | Dev server and build |
| @rollup/plugin-yaml | Load YAML packs at build time |
| vitest | Unit tests and content evals |
| @supabase/supabase-js | Optional sign-in, sync and leaderboard (official Supabase client) |
| typescript, @types/react, @types/react-dom | Types |

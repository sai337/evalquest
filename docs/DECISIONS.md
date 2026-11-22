# Decisions and dependencies

| Date | Decision | Why |
|---|---|---|
| 2026-11-20 | Build with AI-DLC (Inception → Construction → Operations) plus eval-driven content gates | Visible design trail; the game's own content is evaluated the way it teaches |
| 2026-11-20 | Static site, deterministic in-browser grading | Free, private, no API keys, forkable |
| 2026-11-20 | Launch with 3 deep packs, grow via community packs | Quality first; packs are one YAML file |
| 2026-11-20 | Add the Pack Forge self-improving content loop as the next unit | Generate → evaluate → learn → human-reviewed PR |
| 2026-11-21 | Optional Supabase backend: GitHub sign-in, cross-device sync, public leaderboard (owner's choice) | Players asked for a real scoreboard; core game still works with no backend. Stores only GitHub username, avatar, XP, per-challenge best scores and a leaderboard opt-in. RLS limits writes to your own row; the leaderboard RPC exposes only username, avatar, XP and solved count. Scores are graded client-side, so the board is bragging rights, not certification. |
| 2026-11-21 | Advanced tier opened; 6 new packs (insurance, travel, coding agent, SRE/NOC, HR, RAG) | Breadth of real agentic use cases with Advanced topics: pass^k, multi-turn, reward hacking, self-improving loops, judge bias, retrieval vs generation |
| 2026-11-21 | Phase 0 foundations from the coverage-expansion roadmap, tests first | Every later pack and mechanic depends on them |
| 2026-11-21 | Provenance: pack `sources` (title, url, verified) + per-challenge `provenance` (documented / benchmark / hypothetical) and `source` | Honest labelling protects credibility. Content evals fail packs with no source, hypothetical challenges that don't say so, and documented/benchmark challenges that don't name a pack source. `verified: true` = the source was opened during the Nov 2026 research pass; flip to false for anything not checked. All 48 existing challenges are labelled hypothetical (they are designed scenarios). |
| 2026-11-21 | `answer.also_accept` codes on Trace Detective | A step can legitimately be both a policy break and an unapproved action; defensible answers get full marks and the UI names the main code the explanation teaches |
| 2026-11-21 | Five failure codes: `unapproved_action`, `spec_gaming`, `coordination_failure`, `misrecognition`, `unsafe_output` (15 total) | Each teaches a distinct eval (approval gates, protected graders, step-level coordination checks, perception-layer evals, output handling). Re-coded: coding-agent-a1 → `spec_gaming`, travel-booking-p1 → `unapproved_action`; old codes kept as `also_accept` |
| 2026-11-21 | Optional confidence pick (50/70/90/99%) scored with the Brier score; calibration curve on the Practice page | Showing players their overconfidence is itself instruction (Roediger & Karpicke). localStorage only, last 500 picks, no backend |
| 2026-11-21 | Review deck: anything short of a clean, hint-free solve returns after 1, 3, 7 days; graduates after the 7-day review | Spaced retrieval beats restudy. A failing Judge Builder run is iteration, not a miss. localStorage only |
| 2026-11-21 | Mastery gating: a tier unlocks at 75% mean best score (partial credit counts) on the tier below; empty tiers are skipped; locked challenges can be previewed with no XP | Agent Breaker's 75/100 gate. Preview keeps the game explorable for experienced players without letting XP skip the ladder. The daily puzzle comes from unlocked tiers only |
| 2026-11-21 | Phase 1 mechanics Twin Trace (`twin_trace`) and Spot the Eval Bug (`eval_bug`) | Twin Trace grades step 0.4 + code 0.3 + cause 0.3; a content eval recomputes the first divergence so authors can't ship a wrong step. Eval Bug grades line 0.5 + bug type 0.5 from a fixed list of five bug classes |
| 2026-11-21 | 11 Phase 1 extension challenges in 5 existing packs (Replit, Antigravity, Amazon Q, Bunnings, mouldy-food refund loop, Who Gives A Crap, Moffatt x2, DPD, a 96.12 grader, harness isolation) | Documented anchors from the research doc; traces are reconstructions and say so. The retail anchors' details were not re-fetched this session, so explanations state only what the headlines and the research doc support |
| 2026-11-21 | Red Team Sim (`red_team`): a finite state machine (deliver → filter → obey → act → goal) runs a tile payload (channel × instruction × disguise) against declared defences | Attack games teach injection well and stay deterministic when the "agent" is a rule set that obeys any instruction it can read. Four defence kinds only: `content_filter` (sees the visible text, so encoded payloads bypass it), `block_channel`, `deny_tools`, `approval` (the human approves only actions they asked for). Grading: attack 0.5 if any combination reaches `goal_effect`; defence 0.5 only if it stops **every** attack that works at baseline (not just the player's) AND every utility task passes, a strict superset of AgentDojo's rule. Content evals prove the declared attack wins, at most half the combinations win, baseline utility passes, exactly one defence passes and one tempting defence over-blocks |
| 2026-11-21 | Phase 1 M3 packs: `mcp-data-agent`, `inbox-assistant`, `computer-use` (15 challenges, first 3 Pro) and two glossary terms (`lethal-trifecta`, `utility-under-attack`) | Densest verified incident record (Supabase MCP, GitHub MCP, Atlas, EchoLeak, Invitation Is All You Need, Comet) plus benchmarks (AgentDojo, OSWorld-Verified, OSWorld-Human). WebFetch was unavailable this session, so `verified: true` for new sources means the claims used were confirmed in search-result text from the source or close coverage; Spider 2.0 numbers and the 85% OSWorld claim are `verified: false` and labelled unverified in the challenge text. Red-team demos are described as researcher demonstrations, not customer incidents |
| 2026-11-21 | Tightened ecommerce-b4/p4/p5 against re-checked retail coverage | b4 now matches the Bunnings case (extension-cord plug, Queensland, Dec 2025, referral safeguard); p4 opens with the reported Woolworths "Can you say that again?" exchange; p5 now says the typo was in an email and the AI agent confirmed it (Who Gives A Crap, July 2026). Added Internet Retailing and YourLifeChoices as sources |

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

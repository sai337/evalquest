<div align="center">

# 🔎 EvalQuest

### Learn LLM & AI-agent evals by playing, from beginner to SME.

Judge real-looking traces from **9 AI agents**: shopping, banking, contact center, insurance, travel, coding, SRE/NOC, recruiting and RAG. Spot the failure, pick the metric, build a judge, and **prove it agrees with humans**.

**[▶ Play now (free, in your browser)](https://evalquest-livid.vercel.app)** · [Add a scenario pack](CONTRIBUTING.md) · [How it's built](docs/aidlc/01-inception.md)

[![CI](https://github.com/sai337/evalquest/actions/workflows/ci.yml/badge.svg)](https://github.com/sai337/evalquest/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-blue.svg)](CONTRIBUTING.md)
![No sign-up](https://img.shields.io/badge/sign--up-none-purple.svg)

<img src="docs/img/judge.png" alt="Judge Builder: build a judge and compare it with human labels using a confusion matrix" width="820" />

</div>

---

## Why this exists

Every team shipping an AI agent eventually asks: **"is it actually working?"** Answering that is a skill, and most of us learn it from blog posts.

EvalQuest makes you **do** it:

- 🔎 **Read agent traces**, not just final answers. Most agent bugs hide in tool calls.
- 🧭 **Choose the right eval** for the job: end-state task success, faithfulness, tool-call accuracy, severity gates.
- ⚖️ **Build a judge and check it against humans.** Most courses skip this skill: a judge with 92% agreement can still miss 70% of the real failures.

No API keys, no tracking. Progress saves in your browser. **Sign in with GitHub** (optional) to sync across devices and climb the 🏆 leaderboard.

## Three ways to play

| Mode | You do | You learn |
|---|---|---|
| 🔎 **Trace Detective** | Click the failing step(s) in an agent trace and name the failure | Hallucination, policy breaks, prompt injection, unsafe retries, missed escalations… |
| 🧭 **Eval Call** | Pick the metric, dataset or design that catches the problem | Golden datasets, task success, severity weighting, class imbalance |
| ⚖️ **Judge Builder** | Compose a judge, run it on human-labelled samples, read the confusion matrix | LLM-as-judge design, agreement vs precision/recall, rubric traps |

## The ladder

| Tier | Focus | Status |
|---|---|---|
| 1 · Beginner | Spot failures, learn the words | ✅ live |
| 2 · Practitioner | Rubrics, golden sets, LLM-as-judge | ✅ live |
| 3 · Advanced | pass^k consistency, multi-turn, reward hacking, judge bias, self-improving loops, retrieval vs generation | ✅ live |
| 4 · Pro | Judge calibration (Cohen's κ), drift, CI release gates | 🗺 planned |
| 5 · SME | Boss fights: design the eval strategy for a whole agent platform | 🗺 planned |

## Scenario packs

| Pack | Agent | Example failures |
|---|---|---|
| 🛒 E-commerce | **ShopBot**: orders, refunds, coupons | Refund over the approval limit, invented delivery date, coupon injected through a product review |
| 🏦 Banking | **Penny**: balances, transfers, fraud | Balance leaked to an unverified caller, blind retries of a timed-out transfer |
| 🎧 Contact center | **Nova**: telecom support and rep copilot | Contradicting the outage tool, retention loop instead of escalation |
| 🛡️ Insurance | **Clara**: home-insurance claims | Wrong deductible, leaking an internal fraud flag, pass@k vs pass^k |
| ✈️ Travel | **Atlas**: flights and hotels | Wrong search date, booking without consent, forgetting a mid-chat change |
| 💻 Coding agent | **Patch**: edits code, runs tests, opens PRs | "All tests pass" without running them, injected code comment, editing the test to go green |
| 🚨 SRE / NOC | **Sentinel**: incident triage and remediation | SEV1 change without paging, restart loops, self-rewriting runbooks |
| 🧑‍💼 HR & recruiting | **Hira**: screening and scheduling | Age inference, leaking another candidate's salary, judge position bias |
| 📚 RAG knowledge base | **Sage**: cited answers from the wiki | Wrong number with a right citation, restricted docs, retriever vs generator |
| ＋ **Yours** | Healthcare admin, legal, sales, education, supply chain… | [Add a pack →](CONTRIBUTING.md) |

Each pack is **one YAML file**. No code needed.

## Run locally

```bash
git clone https://github.com/sai337/evalquest && cd evalquest
npm install
npm run dev      # play at http://localhost:5173
npm test         # grader tests + content evals
```

### Optional: sign-in and leaderboard (self-hosting)

The game runs fully without a backend. To enable GitHub sign-in, sync and the leaderboard on your own deployment:

1. Create a Supabase project and run [`supabase/migrations/0001_players.sql`](supabase/migrations/0001_players.sql).
2. Enable the GitHub provider in Supabase Auth (GitHub OAuth app callback: `https://<project>.supabase.co/auth/v1/callback`).
3. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (see [`.env.example`](.env.example)).

## Add a pack in 4 steps

1. Copy [`packs/_template.yaml`](packs/_template.yaml) to `packs/your-domain.yaml`.
2. Write challenges from failures you've actually seen.
3. Run `npm test`. The content evals tell you exactly what to fix.
4. Open a PR.

## Architecture

```mermaid
flowchart LR
  subgraph Content["Community content"]
    P["packs/*.yaml"]
  end
  subgraph CI["CI quality gates"]
    S[Zod schema]
    CE["Content evals<br/>(solvable, non-trivial, valid answers)"]
    UT[Grader unit tests]
  end
  subgraph App["Static web app"]
    L[Pack loader] --> G["Deterministic graders<br/>trace · mcq · judge"] --> UI[React UI]
    UI <--> LS[(localStorage)]
  end
  P --> S --> CE
  P --> L
  CE & UT -->|green| V[Vercel deploy]
```

**Evals all the way down.** Every pack is checked by automated *content evals* before it can merge. For example, every Judge Builder challenge must be solvable by its reference judge **and** must defeat the "tick every box" judge, so there's always a real trap to learn from.

## How it's built

Built with the **AI-Driven Development Life Cycle (AI-DLC)**, with an approval gate at each phase:

- [Inception](docs/aidlc/01-inception.md): requirements, user stories, design, units of work
- [Construction](docs/aidlc/02-construction.md): test-first engine, content evals, UI smoke tests
- [Operations](docs/aidlc/03-operations.md): deploy, CI gates, improvement loop

## Roadmap

- [x] Engine, 3 packs, Beginner + Practitioner tiers, content evals, CI
- [x] 9 packs / 48 challenges, Advanced tier, hints, daily puzzle, share card
- [x] Optional GitHub sign-in, cross-device sync and leaderboard
- [ ] **Pack Forge**: a self-improving loop. An agent drafts packs, evals grade them, failures become lessons for the next run, and every draft arrives as a PR for human review.
- [ ] Pro tier: judge calibration with Cohen's κ, drift, CI release gates
- [ ] SME boss fights
- [ ] Live Mode: bring your own key and run a real LLM judge
- [ ] Export traces as OpenInference to replay in Arize Phoenix and other eval tools
- [ ] 15+ packs: healthcare admin, legal review, sales SDR, education tutor, voice and computer-use agents

## Contributing

Packs, bug reports and challenge feedback are all welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

If EvalQuest taught you something, **⭐ star the repo** so more people find it.

## License

[MIT](LICENSE) © sai337

# Contributing to EvalQuest

The fastest way to help: **add a scenario pack for an industry you know.** It's one YAML file and no code.

## Add a pack in 4 steps

1. Fork the repo and run `npm install`.
2. Copy `packs/_template.yaml` to `packs/<your-domain>.yaml` and fill it in. Include at least one Beginner and one Practitioner challenge.
3. Run `npm test`. The content evals tell you exactly what's wrong (for example: *"reference judge only reaches 0.75"*).
4. Run `npm run dev`, play your pack end to end, then open a PR.

Not ready to write YAML? [Open a "New scenario pack" issue](../../issues/new?template=new-pack.yml) describing the agent and the failures you've seen. Someone else can pick it up.

## What makes a great challenge

- **Realistic.** Failures you've actually seen in production beat clever ones.
- **One clear answer.** If two failure categories fit equally well, rewrite the trace until one fits clearly.
- **Teaches the why.** The explanation should say what went wrong, why it matters, and which eval would catch it.
- **Label provenance honestly.** Set `provenance: documented | benchmark | hypothetical` on every challenge. Documented and benchmark challenges set `source:` to one of the pack's `sources` titles; hypothetical ones say "hypothetical" in the explanation. Name a law or regulation in an explanation only after you have read its primary text; otherwise state the rule as the agent's fictional company policy.
- **Two defensible codes?** Pick the one the explanation teaches as `category` and list the other in `also_accept`.
- **Judge Builder needs a trap.** Add at least one check that *sounds* like quality but that the human labellers ignore. That's where the learning is.

## Wanted packs

Insurance claims · healthcare triage (no medical advice) · travel booking · HR recruiting · legal contract review · coding agent · SRE / NOC incident agent · sales SDR · education tutor · real estate · supply chain · research agent with RAG · computer-use agent · voice agent · multi-agent workflows.

## Engine changes

Write or change a test in `tests/` first, then the code. Keep dependencies minimal; explain any new one in `docs/DECISIONS.md`.

## Code of conduct

Be kind and assume good intent. Harassment isn't tolerated.

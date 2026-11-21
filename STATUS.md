# Status

**Updated:** 2026-11-20 · **Phase:** 1 complete (AI-DLC Inception → Construction → Operations)

## Live
- Game: https://evalquest-livid.vercel.app (auto-deploys from `main`)
- CI: tests + content evals + type-check + build + bundle budget on every push and PR

## Done
- Engine: Zod schema, 3 graders (Trace Detective, Eval Call, Judge Builder), progress/XP/ranks/badges
- Content: 3 packs (e-commerce, banking, contact center), 18 challenges, Beginner + Practitioner tiers
- Quality: 29 tests incl. content evals; mutation check confirmed a broken pack is rejected
- Docs: AI-DLC phase docs, CONTRIBUTING, pack template (itself validated), issue/PR templates, launch kit

## Next
1. Pack Forge (U5b): self-improving pack generator → content evals + rubric judge → `forge/LESSONS.md` → PR
2. Advanced tier content + 3 more packs (insurance claims, coding agent, SRE/NOC)
3. Repo owner: set GitHub topics, description and social preview (see docs/LAUNCH.md)

## Open decisions
- Model/key for the Pack Forge (TrueFoundry gateway, OpenRouter or Claude) stored as a GitHub Actions secret
- Custom domain for the game

# Decisions and dependencies

| Date | Decision | Why |
|---|---|---|
| 2026-11-20 | Build with AI-DLC (Inception → Construction → Operations) plus eval-driven content gates | Visible design trail; the game's own content is evaluated the way it teaches |
| 2026-11-20 | Static site, deterministic in-browser grading | Free, private, no API keys, forkable |
| 2026-11-20 | Launch with 3 deep packs, grow via community packs | Quality first; packs are one YAML file |
| 2026-11-20 | Add the Pack Forge self-improving content loop as the next unit | Generate → evaluate → learn → human-reviewed PR |

## Dependencies (all mainstream, latest at time of adding, `npm audit`: 0 vulnerabilities)

| Package | Why |
|---|---|
| react, react-dom | UI |
| zod | Pack schema validation with readable errors |
| vite, @vitejs/plugin-react | Dev server and build |
| @rollup/plugin-yaml | Load YAML packs at build time |
| vitest | Unit tests and content evals |
| typescript, @types/react, @types/react-dom | Types |

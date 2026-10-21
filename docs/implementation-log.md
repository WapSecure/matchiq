# Implementation Log

Newest entries first. Each entry records what was delivered, the evidence, and what remains. Status labels: **Done**, **Partial**, **Blocked**.

## 2026-10-21 — M1: Synthetic generator and replay engine (MQ-003, replay part of MQ-004)

### Delivered

| Area                                                                                                                                                                                                                                                              | Status | Evidence                                                                                                |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------- |
| `libs/synthetic-data`: seeded mulberry32 PRNG, fictional clubs and 18-player squads, rule-based possession state machine (passes, carries, pressure, tackles, fouls, cards, shots, saves, goals, substitutions, restarts) over two halves plus stoppage           | Done   | 55 Vitest tests, including fast-check properties across random seeds and all five scenarios             |
| Five scenario presets (`comeback`, `possession-dominance`, `red-card-swing`, `high-press`, `low-event`), shaped by team parameters and scripted beats. Results for the scripted scenarios hold for every seed                                                     | Done   | Property tests assert each scenario's outcome for random seeds                                          |
| `validateFixtureEvents` / `validateFixtureFile`: contract parsing, sequences, IDs, clocks, period structure, player/team/on-pitch checks (substitutions and dismissals respected), reference integrity, GOAL-only scoring, manifest check. Returns typed issues   | Done   | Mutation tests for every issue code                                                                     |
| Canonical JSON + SHA-256 event hash; `pnpm generate:fixture` and `pnpm validate:fixture` (build, then run the compiled ESM CLI)                                                                                                                                   | Done   | CLI run end-to-end from the root scripts; CLI unit tests with injected IO                               |
| Golden fixtures for all five scenarios (seed 42) in `fixtures/`, with a manifest table                                                                                                                                                                            | Done   | `golden.spec.ts` regenerates each file and compares it with the committed JSON and a pinned hash        |
| `libs/replay`: `Scheduler` port (system + `ManualScheduler`), `ReplayController` implementing `ReplayCommand`/`ReplayStatus` with pacing by clock gaps ÷ speed (gaps capped at 5 s, 3 s period break), pause/resume/setSpeed/seek with reset signal, typed errors | Done   | 17 Vitest tests, including a fast-check property over random command interleavings and 1× vs 30× parity |

### Notes

- Event density is about 1,000 (low-event) to 1,470 (comeback) events per match at seed 42. `matchClockMs` restarts at 0 in each period.
- Not in this PR: replay checkpoints, the proposed `pnpm replay` CLI, HTTP/SSE wiring and correction handling. These belong to the backend stream (MQ-004/006); `ReplayController` is ready to be wrapped.
- Own goals are never generated. The validator credits an own goal to the opponent of `GOAL.teamId`, which is an assumption the contract does not yet state.

### Next

Football engine projections over these fixtures (MQ-005), ingest/replay API on top of `ReplayController` (MQ-004/006), and correction and out-of-order fixtures for the ingest tests.

## 2026-10-21 — M0: Foundation (MQ-001, MQ-002)

### Delivered

| Area                                                                                                                                                                                                      | Status  | Evidence                                                                                                     |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------ |
| Nx 23 + pnpm 10 workspace, strict TS, ESLint (boundaries, size and complexity caps), Prettier, pinned dependencies                                                                                        | Done    | `pnpm verify`                                                                                                |
| Docker Compose: Postgres 17.6, Redis 8.2 (ports 54320, 63790)                                                                                                                                             | Done    | Both containers healthy                                                                                      |
| CI: PR title, promotion path, verify, e2e, gitleaks, `pnpm audit`, `pip-audit`                                                                                                                            | Done    | Workflow committed; first run happens on the PR                                                              |
| Governance docs, 10 ADRs, CODEOWNERS, PR template                                                                                                                                                         | Done    | `docs/engineering`, `docs/adr`                                                                               |
| `libs/contracts`: Zod v1 contracts for fixtures, teams, players, 22 event types, snapshots, evidence, insights, agents, narratives, overlays (with state machine), replay, SSE envelopes, problem details | Done    | 44 Vitest tests                                                                                              |
| `libs/config`: validated env schemas that never echo secrets                                                                                                                                              | Done    | 6 tests                                                                                                      |
| `libs/server-kit`: helmet, CORS, RFC 9457 problems, request IDs, health module, `EnvModule`                                                                                                               | Done    | 10 Jest tests                                                                                                |
| `apps/api`, `apps/worker`: Nest bootstrap with live/ready health under `/api/v1`                                                                                                                          | Done    | 3 + 2 Jest tests; built server smoke-tested                                                                  |
| Cross-language contracts: JSON Schema export, Pydantic codegen, shared samples validated in both languages                                                                                                | Done    | Vitest `samples.spec.ts`, pytest `test_contract_samples.py`                                                  |
| `apps/agents`: FastAPI, Agent Framework 1.22 + Foundry 1.15 client factory, settings, health, Foundry probe script                                                                                        | Partial | 20 pytest tests; Ruff and Pyright strict clean. **Live Foundry call not yet exercised** (needs Azure access) |

### Findings fixed during M0

- Duplicate `@nestjs/common` copies came from mismatched `rxjs` peer versions. Fixed with pnpm overrides.
- Zod emitted a regex `pattern` alongside `format: date-time`, which Pydantic cannot apply to parsed datetimes. The exporter now drops it, and a test covers this.

### Azure and Foundry access spike

| Check                                                           | Result                                                                                                                                                                               |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Agent Framework Python SDK available and compatible             | **Verified.** `agent-framework-core` 1.22.0 (2026-10-15) and `agent-framework-foundry` 1.15.0 install on Python 3.12, and the constructor and `run` signatures match Microsoft Learn |
| Azure CLI                                                       | Installed (2.91.0). **Not logged in.** Requires the owner's `az login`                                                                                                               |
| Subscription, resource group and deployment permissions         | **Unverified.** Blocked on login                                                                                                                                                     |
| Foundry project endpoint and model deployment, quota and region | **Unverified.** Blocked on login and project details                                                                                                                                 |
| End-to-end structured-output call                               | **Not run.** `apps/agents/scripts/foundry_probe.py` is ready                                                                                                                         |

### Next

Remaining M0 pull requests, then M1.

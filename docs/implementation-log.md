# Implementation Log

Newest entries first. Each entry records what was delivered, the evidence, and what remains. Status labels: **Done**, **Partial**, **Blocked**.

## 2026-10-21 — M1: Event ledger, idempotent ingest and resumable SSE (MQ-004, MQ-006)

### Delivered

| Area                                                                                                                                                                                                     | Status  | Evidence                                                                                                     |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------ |
| `libs/db`: Drizzle schema, migration `0000_event_ledger` (`fixtures`, `match_events`, `stream_messages`, `audit_events`, `idempotency_keys`, all with `org_id`), ports and Postgres/Redis adapters       | Done    | `pnpm nx run db:migrate` applied to local Postgres; 15 Vitest tests (8 integration on real Postgres + Redis) |
| ADR-0006 accepted: Drizzle, Postgres ledger, transactional outbox to Redis pub/sub                                                                                                                       | Done    | `docs/adr/0006-persistence-and-messaging.md`                                                                 |
| Fixtures API: `POST /fixtures` (operator, 201/409), `GET /fixtures`, `GET /fixtures/:id`, `GET /fixtures/:id/events` (cursor `afterSequence`, limit ≤ 500)                                               | Done    | `fixtures.integration.spec.ts`, `ingest.integration.spec.ts`                                                 |
| Ingest `POST /fixtures/:id/events:batch`: one transaction for events, duplicate counting, 409 on changed body or taken sequence, 422 on fixture mismatch, 404 on unknown fixture, outbox rows, audit row | Done    | `ingest.integration.spec.ts` (10 tests), `classify-batch.spec.ts`, `ingest.service.spec.ts`                  |
| Optional `Idempotency-Key` on both POSTs: replay of the stored response, 422 when reused with a different body                                                                                           | Done    | Integration tests for both endpoints                                                                         |
| Operator bearer guard (SHA-256 + `timingSafeEqual`), 401 problems with `WWW-Authenticate`; reads anonymous; `@nestjs/throttler` at `RATE_LIMIT_PER_MINUTE`                                               | Done    | `operator-auth.guard.spec.ts`, `operator-access.integration.spec.ts`                                         |
| Outbox relay in the API process: `FOR UPDATE SKIP LOCKED`, at-least-once, kicked after commit plus polling                                                                                               | Done    | `outbox-relay.spec.ts`, `ledger.integration.spec.ts`                                                         |
| SSE `GET /fixtures/:id/stream`: `Last-Event-ID` or `?lastEventId=` replay from Postgres, then live Redis messages, gap fill and de-duplication by `streamSequence`, heartbeats, cleanup on disconnect    | Done    | `stream.integration.spec.ts`, `stream-session.spec.ts`; curl smoke test against the built API                |
| Postgres and Redis readiness indicators (503 when either is down)                                                                                                                                        | Done    | `health.indicators.spec.ts`, `app.module.spec.ts`                                                            |
| CI `verify` job gets Postgres 17.6 and Redis 8.2 service containers for the integration tests                                                                                                            | Partial | Workflow updated; proven by the PR run                                                                       |

### Findings fixed during M1

- The relay first drained in `created_at` order. Concurrent transactions share no commit order with `now()`, so the integration test caught out-of-order publication. It now drains in `(org_id, fixture_id, stream_sequence)` order with a matching partial index.
- A real ioredis client left a connect timer alive after `disconnect()` against a refused port, which held Jest workers open. The readiness test uses a rejecting PING instead.

### Known limitations

- Out-of-order or gapped event sequences are accepted as long as they are unique; the §24 reorder window and dead-letter queue are not implemented.
- Rate limiting uses in-memory storage per API instance and keys by socket address (no `trust proxy` yet).
- SSE does not apply per-connection backpressure, and a fresh connection without `Last-Event-ID` starts at the live head (clients load the snapshot first, ADR-0005).
- `GET /fixtures` returns at most 100 fixtures without a cursor.

### Next

Snapshot projection wired to the outbox (`match.snapshot`), replay controls, worker consumers on the same outbox.

## 2026-10-21 — Local-first AI providers (ADR-0012)

| Area                                                               | Status                                                          | Evidence                                               |
| ------------------------------------------------------------------ | --------------------------------------------------------------- | ------------------------------------------------------ |
| Azure subscription                                                 | **Blocked (owner)**: account has no subscription and no credits | `az login` reports "No subscriptions found"            |
| Decision: local-first, cloud-ready (`mock` / `ollama` / `foundry`) | Done                                                            | ADR-0012                                               |
| `ModelProvider` contract includes `ollama`                         | Done                                                            | Vitest `pipeline.spec.ts`; regenerated Pydantic models |

## 2026-10-21 — M1: Football engine (MQ-005, MQ-007)

### Delivered

| Area                                                                                                                                                                                | Status | Evidence                                                                |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------- |
| `libs/football-engine` (`scope:shared`, `type:domain`): pure `createInitialState`, `applyEvent`, `project`, `toSnapshot` producing contract `MatchSnapshot` with sha256 `stateHash` | Done   | `projection.spec.ts`, Zod-parsed in every snapshot test                 |
| Idempotent application (duplicate sequence or eventId is a no-op), out-of-order re-fold, `provisional` while a sequence gap or a pending correction exists                          | Done   | Property: any arrival order plus duplicates equals in-order projection  |
| CORRECTION (VOID) by re-folding the ledger without voided events                                                                                                                    | Done   | `corrections.spec.ts`                                                   |
| Metrics with a versioned `MetricDefinition` registry: counts, pass completion (ZERO_DENOMINATOR), time-weighted possession with contested time excluded, event-share proxy fallback | Done   | `counting.spec.ts`, `possession.spec.ts`, `verify-and-registry.spec.ts` |
| Rolling 5-minute and previous-window metrics, momentum index (spec §9 weights, bounded z against a fixed reference scale, `heuristic: true`)                                        | Done   | `momentum.spec.ts` asserts hand-computed values                         |
| Key moments with full evidence envelopes: GOAL and RED_CARD (P0), SHOT_BURST, HIGH_REGAINS, PRESSURE_SWING, MOMENTUM_SHIFT (P1); debounce; deterministic ids; resumable cursor      | Done   | `moments.spec.ts`, `golden.spec.ts`; every insight Zod-parsed           |
| `verifyCitedValues` and `verifyEvidenceIds` for the publish gate                                                                                                                    | Done   | `verify-and-registry.spec.ts`                                           |
| Golden fixtures with pinned state hashes (zero-event match, late comeback with void, own goal and second yellow)                                                                    | Done   | `golden.spec.ts`                                                        |
| Property tests (fast-check 4.10.2): determinism, order independence, score oracle, non-negative counts, bounded percentages and momentum, contract-valid insights                   | Done   | 60 Vitest tests in 9 files                                              |

### Known limitations

- Momentum reference means and deviations are product calibration constants for synthetic fixtures, not league statistics. Recalibrate once the synthetic generator's distributions are fixed.
- Re-folding is O(ledger) per late event or correction (about 3 ms for 3,000 events locally). The in-order path is incremental.
- `stepMoments` serves the in-order path. After a correction or a late event the worker re-runs `detectKeyMoments` and diffs by `insightId` to retract or add insights.
- PLAYER_MILESTONE (P2) is not implemented.

### Next

Wire the engine into the worker projection and the deterministic publish gate, and add golden replay tests against the synthetic generator's seeded fixtures.

## 2026-10-21 — M2 groundwork: pipeline contracts (MQ-009)

| Area                                                                                                                                                      | Status | Evidence                                        |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------- |
| `PipelineRequest`, `PipelineResult`, `NarrativeDraft`, `OverlayProposal` contracts for the worker ↔ agents boundary, exported to JSON Schema and Pydantic | Done   | Vitest `pipeline.spec.ts`; pytest sample parity |
| JSON Schema export drops Zod's duplicate regex for every `format` (date-time, uuid) so generated models validate                                          | Done   | `json-schema.spec.ts`                           |
| `agents` lint, typecheck and test depend on `codegen` (removes a race with regeneration)                                                                  | Done   | `project.json`                                  |

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
| `apps/web`: Tailwind v4 design tokens, icon components, UI primitives, landing shell                                                                                                                      | Done    | 9 Vitest + 10 Playwright/axe tests (desktop and mobile)                                                      |

### Findings fixed during M0

- Duplicate `@nestjs/common` copies came from mismatched `rxjs` peer versions. Fixed with pnpm overrides.
- Zod emitted a regex `pattern` alongside `format: date-time`, which Pydantic cannot apply to parsed datetimes. The exporter now drops it, and a test covers this.
- The generated Next.js 16.1.7 had 2 critical and 18 high advisories. Upgraded to 16.4.2; `pnpm audit --prod` is now clean.
- axe found a WCAG contrast failure on `ink-subtle`. The token was raised to `#788494` (≥ 4.6:1 on all surfaces).

### Azure and Foundry access spike

| Check                                                           | Result                                                                                                                                                                               |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Agent Framework Python SDK available and compatible             | **Verified.** `agent-framework-core` 1.22.0 (2026-10-15) and `agent-framework-foundry` 1.15.0 install on Python 3.12, and the constructor and `run` signatures match Microsoft Learn |
| Azure CLI                                                       | Installed (2.91.0). **Not logged in.** Requires the owner's `az login`                                                                                                               |
| Subscription, resource group and deployment permissions         | **Unverified.** Blocked on login                                                                                                                                                     |
| Foundry project endpoint and model deployment, quota and region | **Unverified.** Blocked on login and project details                                                                                                                                 |
| End-to-end structured-output call                               | **Not run.** `apps/agents/scripts/foundry_probe.py` is ready                                                                                                                         |

### Next

M1: MQ-003 seeded generator, MQ-004 ledger and idempotent ingest, MQ-005 deterministic metrics, MQ-006 SSE and snapshot reconciliation.

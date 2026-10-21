# Implementation Log

Newest entries first. Each entry records what was delivered, the evidence, and what remains. Status labels: **Done**, **Partial**, **Blocked**.

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

# Architecture Rules

The source of truth for product behaviour is `docs/product/MatchIQ_Enterprise_Master_Specification_v3.md`. Decisions that refine or deviate from it are recorded in `docs/adr/`.

## Projects

| Project    | Path              | Tags                           | Responsibility                                                                 |
| ---------- | ----------------- | ------------------------------ | ------------------------------------------------------------------------------ |
| web        | `apps/web`        | `scope:web` `type:app`         | Next.js UI. Talks only to the API (REST + SSE).                                |
| api        | `apps/api`        | `scope:api` `type:app`         | Authoritative writes, ingest, replay control, SSE gateway. Never calls models. |
| worker     | `apps/worker`     | `scope:worker` `type:app`      | Projection, moment detection, deterministic quality gate, overlay scheduling.  |
| agents     | `apps/agents`     | `scope:agents` `type:app`      | Stateless Python service: Agent Framework + Foundry. Returns proposals only.   |
| web-e2e    | `apps/web-e2e`    | —                              | Playwright + axe.                                                              |
| contracts  | `libs/contracts`  | `scope:shared` `type:contract` | Zod schemas, the only hand-written contract source.                            |
| config     | `libs/config`     | `scope:shared` `type:util`     | Validated environment loading.                                                 |
| server-kit | `libs/server-kit` | `scope:server` `type:util`     | Nest HTTP baseline: health, problem details, request IDs, env module.          |

Planned for M1 (created by their owning stream with these tags):

| Project                | Tags                              |
| ---------------------- | --------------------------------- |
| `libs/football-engine` | `scope:shared` `type:domain`      |
| `libs/synthetic-data`  | `scope:shared` `type:domain`      |
| `libs/replay`          | `scope:shared` `type:domain`      |
| `libs/db`              | `scope:server` `type:data-access` |

## Dependency rules (enforced by `@nx/enforce-module-boundaries`)

| Source tag                   | May depend on                                                                                       |
| ---------------------------- | --------------------------------------------------------------------------------------------------- |
| `type:app`                   | any library, never another app                                                                      |
| `type:contract`              | `type:contract`                                                                                     |
| `type:util`                  | `type:contract`, `type:util`                                                                        |
| `type:domain`                | `type:contract`, `type:util`, `type:domain`. Framework, database and queue packages are **banned**. |
| `type:data-access`           | contract, util, domain, data-access                                                                 |
| `type:ui`                    | contract, util, ui                                                                                  |
| `scope:shared`               | `scope:shared`                                                                                      |
| `scope:server`               | `scope:shared`, `scope:server`                                                                      |
| `scope:web`                  | `scope:shared`, `scope:web`                                                                         |
| `scope:api` / `scope:worker` | `scope:shared`, `scope:server`, own scope                                                           |

Circular dependencies fail lint.

## Layering inside services

- **Controllers are thin.** They parse input with `ZodValidationPipe`, call an application service, and return a contract type.
- **Domain logic is framework-free** and lives in `type:domain` libraries as pure functions over contract types.
- **Infrastructure sits behind ports.** Repositories, queues and model clients are interfaces injected by token, so Redis/BullMQ can be replaced with Service Bus, or Foundry with a mock, without touching domain code.
- **Agents propose and services commit.** Only the worker's deterministic gate can move an insight or overlay to a published state.

## Contracts

- Zod in `libs/contracts` is canonical. JSON Schema is exported with `nx run contracts:export-json-schema`, and Pydantic models are generated with `nx run agents:codegen`.
- Every payload carries `schemaVersion`. A breaking change needs a new version and an ADR.
- Shared samples in `libs/contracts/samples/` are validated by both the TypeScript and the Python test suites.
- Contract changes have a single owner, the platform lead. Other streams propose changes through PRs.

## Time, identity and units

- Wall-clock time is UTC ISO-8601 (`Z`). The match clock is `matchClockMs` within `period`.
- `sequence` is the authoritative replay order. `matchClockMs` drives overlay timing.
- IDs are prefixed: `org_`, `fx_`, `tm_`, `pl_`, `ev_`, `in_`, `nr_`, `ov_`, `run_`.
- Units are explicit in names or in `MetricValue.unit`. Unavailable metrics are typed as `unavailable` with a reason and are never zero-filled.

## Introducing new patterns

A new architectural pattern, service or infrastructure dependency requires an ADR that states the problem it solves and the alternatives considered.

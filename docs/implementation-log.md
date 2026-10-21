# Implementation Log

Newest entries first. Each entry records what was delivered, the evidence, and what remains. Status labels: **Done**, **Partial**, **Blocked**.

## 2026-10-21 — M0: Foundation (MQ-001, MQ-002)

### Delivered

| Area                                                                                                                                                                                                      | Status | Evidence                                        |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------- |
| Nx 23 + pnpm 10 workspace, strict TS, ESLint (boundaries, size and complexity caps), Prettier, pinned dependencies                                                                                        | Done   | `pnpm verify`                                   |
| Docker Compose: Postgres 17.6, Redis 8.2 (ports 54320, 63790)                                                                                                                                             | Done   | Both containers healthy                         |
| CI: PR title, promotion path, verify, e2e, gitleaks, `pnpm audit`, `pip-audit`                                                                                                                            | Done   | Workflow committed; first run happens on the PR |
| Governance docs, 10 ADRs, CODEOWNERS, PR template                                                                                                                                                         | Done   | `docs/engineering`, `docs/adr`                  |
| `libs/contracts`: Zod v1 contracts for fixtures, teams, players, 22 event types, snapshots, evidence, insights, agents, narratives, overlays (with state machine), replay, SSE envelopes, problem details | Done   | 44 Vitest tests                                 |
| `libs/config`: validated env schemas that never echo secrets                                                                                                                                              | Done   | 6 tests                                         |
| `libs/server-kit`: helmet, CORS, RFC 9457 problems, request IDs, health module, `EnvModule`                                                                                                               | Done   | 10 Jest tests                                   |
| `apps/api`, `apps/worker`: Nest bootstrap with live/ready health under `/api/v1`                                                                                                                          | Done   | 3 + 2 Jest tests; built server smoke-tested     |

### Findings fixed during M0

- Duplicate `@nestjs/common` copies came from mismatched `rxjs` peer versions. Fixed with pnpm overrides.

### Next

Remaining M0 pull requests, then M1.

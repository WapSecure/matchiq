# Implementation Log

Newest entries first. Each entry records what was delivered, the evidence, and what remains. Status labels: **Done**, **Partial**, **Blocked**.

## 2026-10-21 — M0: Foundation (MQ-001, MQ-002)

### Delivered

| Area                                                                                                               | Status | Evidence                                        |
| ------------------------------------------------------------------------------------------------------------------ | ------ | ----------------------------------------------- |
| Nx 23 + pnpm 10 workspace, strict TS, ESLint (boundaries, size and complexity caps), Prettier, pinned dependencies | Done   | `pnpm verify`                                   |
| Docker Compose: Postgres 17.6, Redis 8.2 (ports 54320, 63790)                                                      | Done   | Both containers healthy                         |
| CI: PR title, promotion path, verify, e2e, gitleaks, `pnpm audit`, `pip-audit`                                     | Done   | Workflow committed; first run happens on the PR |
| Governance docs, 10 ADRs, CODEOWNERS, PR template                                                                  | Done   | `docs/engineering`, `docs/adr`                  |

### Next

Remaining M0 pull requests, then M1.

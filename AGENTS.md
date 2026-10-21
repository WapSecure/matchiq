# AGENTS.md

Instructions for any coding agent working in this repository. `CLAUDE.md` holds the commands and architecture summary, and `docs/engineering/` holds the binding policies.

## Before you change anything

1. Read the relevant sections of `docs/product/MatchIQ_Enterprise_Master_Specification_v3.md` and the ADRs.
2. Confirm your workstream and the paths it owns (below). Work in your own git worktree on a branch cut from `dev`.
3. State the acceptance criteria and tests before you implement.

## Workstream ownership

| Stream           | Owns                                                                                                                    | Must not edit without a PR to the owner |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| A: Platform lead | root config, `tools/`, `.github/`, `libs/contracts`, `libs/config`, `libs/server-kit`, `libs/db` migrations, `docs/adr` | n/a                                     |
| B: Football data | `libs/football-engine`, `libs/synthetic-data`, `libs/replay`, `fixtures/`                                               | contracts                               |
| C: Backend       | `apps/api`, `apps/worker`                                                                                               | contracts, migrations                   |
| D: Agents        | `apps/agents` (except `contracts/generated`)                                                                            | contracts                               |
| E: Frontend      | `apps/web`, `libs/ui`, `libs/i18n`                                                                                      | contracts                               |
| F: Infra and QA  | `infra/`, `apps/web-e2e`, deploy workflows                                                                              | CI quality gates                        |

## Hard rules

- Never fabricate command output, test results, Azure or Foundry access, or deployment status.
- Never present mock AI output as a live integration.
- Never disable lint rules, skip tests or loosen types to get green. Fix the cause or report the blocker.
- Never commit secrets. Never provision paid cloud resources without owner approval.
- No AI or tool attribution in commits or PRs.

## Handoff format

Summary · changed files · commands run with results · tests passing or failing · known limitations · next three tickets.

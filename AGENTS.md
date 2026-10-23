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

## Git workflow

- Never commit to, merge into or fast-forward `dev`, `stage` or `main` locally. A local hook rejects any move of those branches other than syncing to `origin`.
- Work in your own worktree on a branch cut from `origin/dev` (`feat/`, `fix/`, `docs/`, `chore/` + `MQ-<n>-<slug>`). Check open PRs (`gh pr list`) first and claim a free ticket number.
- Merge `origin/dev` into your branch before you push. Keep both sides when resolving conflicts and keep every `docs/implementation-log.md` entry.
- Push the branch and open a PR into `dev` with a Conventional Commit title. A PR merges only when every CI job is green.
- Never reset, rebase or force-push branches you did not create.

## Testing

- CI runs the full suites. Locally run only format, lint and typecheck of the projects you touched, plus single spec files when diagnosing a failure. Do not run `pnpm verify`, full suites, e2e or builds locally.
- Leave the owner's running stack alone: ports 3000, 3001, 4200, 8000 and 8180. Stop only processes you started.

## Product quality

- UI uses the shared components in `apps/web/src/components/ui`. No browser-native selects, date, time or file inputs, `title` tooltips or bare `<details>`.
- Users never see technical errors: no codes, IDs, stack traces or library messages. Map every failure to plain language with a recovery action.
- Write copy for producers, analysts and fans, not engineers. Follow `docs/product/CONTENT_STYLE_GUIDE.md` once it lands; keep technical depth behind an opt-in "Technical details" view.

## Handoff format

Summary · changed files · commands run with results · tests passing or failing · known limitations · next three tickets.

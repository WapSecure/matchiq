# Engineering Standards

Applies to every change in this repository. Each rule lists how it is enforced: **[lint]**, **[types]**, **[ci]**, **[test]** or **[review]**.

## TypeScript

- Strict mode with `noImplicitReturns`, `noUnusedLocals`, `noFallthroughCasesInSwitch`, `noImplicitOverride`. **[types]**
- No `any`, no non-null assertions, `@ts-expect-error` only with a description. **[lint]**
- External input is parsed with a Zod contract at the trust boundary. Never cast unvalidated data. **[review]**
- Type-only imports use `import type` (inline style), except in Nest projects, where decorator metadata needs value imports. **[lint]**
- `===` only. `console.log` is forbidden; use the framework logger. **[lint]**

## Size and complexity limits

| Rule                            | Limit                                 | Enforcement                         |
| ------------------------------- | ------------------------------------- | ----------------------------------- |
| Lines per `.ts` file            | 250                                   | **[lint]** `max-lines`              |
| Lines per `.tsx` file           | 150                                   | **[lint]** `max-lines`              |
| Lines per function or component | 80                                    | **[lint]** `max-lines-per-function` |
| Cyclomatic complexity           | 12                                    | **[lint]** `complexity`             |
| Nesting depth                   | 3                                     | **[lint]** `max-depth`              |
| Parameters                      | 4 (use an options object beyond that) | **[lint]** `max-params`             |

Tests are exempt from the function-length limit and capped at 400 lines per file.

## Constants and reuse

- Reusable strings, regular expressions, limits and magic numbers live in a `constants.ts` module for their project (for example, `libs/contracts/src/lib/constants.ts` and `apps/web/src/constants/`). **[review]**
- UI copy lives in `apps/web/src/constants/*`, not inline in components. **[review]**
- SVGs are React components in `apps/web/src/components/icons/`, built on `IconBase`. Inline `<svg>` elsewhere is rejected in review. **[review]**
- Extract a component or helper on the second duplication. Shared server concerns belong in `libs/server-kit`, shared schemas in `libs/contracts`. **[review]**
- Domain calculations exist once, in `libs/football-engine`. The frontend, backend and agents never re-derive statistics. **[review]**

## Comments

Write a comment only when it carries information the code cannot express: an invariant, a unit, a non-obvious constraint, or a reference to a spec section. Never narrate what the code does. **[review]**

## Python (apps/agents)

- Python 3.12, full type hints, Pyright `strict`. **[types]**
- Ruff with the `E,F,W,I,B,UP,N,S,ASYNC,RUF,SIM,PT,TID,ANN` rule sets, plus `ruff format`. **[lint]**
- Contract models are generated from `libs/contracts` and never edited by hand. **[ci]** drift check

## Dependencies

- Exact versions only (`save-exact=true`). Lockfiles (`pnpm-lock.yaml`, `uv.lock`) are committed. **[ci]** `--frozen-lockfile`, `UV_FROZEN`
- New dependencies require a stated reason in the PR. Prefer the platform or existing libraries. **[review]**
- Production dependencies with high or critical advisories block merge. **[ci]** `pnpm audit`, `pip-audit`

## Formatting and naming

- Prettier (single quotes) for TS, JSON, YAML and Markdown. Ruff format for Python. **[ci]** `format:check`
- Files: `kebab-case.ts`. React components: `PascalCase`. Constants: `SCREAMING_SNAKE_CASE`. Zod schemas: `PascalCase` with an inferred type of the same name.

## Git workflow

- Branches: `feat|fix|chore|docs|refactor|test|ci/<ticket>-<slug>` from `dev`.
- Flow: feature → `dev` → `stage` → `main` (production). Only `dev` may be promoted to `stage`, and only `stage` to `main`. **[ci]** promotion job
- PR titles follow Conventional Commits. **[ci]** PR-title job
- Commits and PRs are authored by the repository owner. No tool attribution trailers.
- Squash-merge feature PRs into `dev`. Use merge commits for promotions, to keep the history traceable.

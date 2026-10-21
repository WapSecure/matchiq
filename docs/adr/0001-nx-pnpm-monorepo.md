# ADR-0001: Nx + pnpm monorepo

- Status: Accepted (2026-10-21)
- Supersedes: spec §7 "pnpm/Turborepo"

## Context

Six deployables in two languages share contracts and must evolve in lockstep under a seven-day deadline, with several parallel coding agents.

## Decision

Use Nx 23 with pnpm workspaces and TypeScript project references (the `@nx/js/typescript` sync generator). Python is integrated as an Nx project (`apps/agents/project.json`) whose targets wrap `uv`. Project tags plus `@nx/enforce-module-boundaries` encode the architecture rules.

## Consequences

- `nx affected` and caching keep CI fast. Boundaries are enforced by lint rather than convention.
- Nx inferred targets mean less hand-written config, but they require `nx sync` (enabled locally and checked in CI).

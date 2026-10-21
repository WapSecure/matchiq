# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

MatchIQ is a hackathon entry for "Microsoft × Premier League: Inside the Game". It is an event-driven football intelligence platform: synthetic events → deterministic match state → evidence-grounded multi-agent narratives → timed broadcast overlays. The product contract is `docs/product/MatchIQ_Enterprise_Master_Specification_v3.md`; sections §23 onward override earlier sections. Deviations are recorded in `docs/adr/`. Submission deadline: **2026-10-27 23:59 PT** (2026-10-28 07:59 WAT). Internal freeze: 2026-10-27 12:00 WAT.

## Commands

```bash
pnpm install && (cd apps/agents && uv sync)   # Node 22 (.nvmrc), pnpm 10, uv
pnpm infra:up                                  # Postgres :54320, Redis :63790
pnpm verify                                    # sync check, format, lint, typecheck, test, build
pnpm nx run-many -t lint typecheck test build  # all projects
pnpm nx test contracts -- -t "rejects unknown" # single Vitest test
pnpm nx test api -- -t "liveness"              # single Jest test (Nest projects)
cd apps/agents && uv run pytest tests/test_health.py -k ready   # single pytest
pnpm nx run web:build && pnpm e2e              # Playwright + axe (web on :4200)
pnpm codegen                                   # Zod → JSON Schema → Pydantic; commit the output
pnpm nx serve api | worker | agents; pnpm nx dev web
```

Copy `.env.example` to `.env`. Every service validates its environment at startup and fails fast.

## Architecture

- `apps/web` (Next.js 16): UI only. Talks to the API.
- `apps/api` (NestJS): authoritative writes, ingest, replay, SSE. Never calls models.
- `apps/worker` (NestJS): projection, moments, the deterministic publish gate, overlays.
- `apps/agents` (Python FastAPI, Microsoft Agent Framework + Foundry): stateless; returns proposals only.
- `libs/contracts`: Zod source of truth for every boundary. Python models are generated into `apps/agents/src/matchiq_agents/contracts/generated` and must never be hand-edited.
- `libs/config`: env schemas.
- `libs/server-kit`: shared Nest baseline (health, RFC 9457 problems, request IDs, `EnvModule`, `configureHttpApp`).

Module boundaries are enforced by Nx tags (see `docs/engineering/ARCHITECTURE_RULES.md`). `type:domain` libraries are pure and cannot import frameworks.

## Rules that are easy to get wrong

- Statistics come only from the deterministic engine. Agents cite `metricRef` and `eventIds` and never invent numbers.
- Data is synthetic only. The synthetic label is always visible. No Premier League marks.
- Never claim Foundry, Azure or tenancy works until it has been exercised (ADR-0003, ADR-0007). The mock provider is not an integration.
- Lint caps: 250 lines per `.ts` file, 150 per `.tsx`, 80 per function, complexity 12. Strings and regexes go in `constants` files, SVGs in `apps/web/src/components/icons`.
- Comments only for non-obvious constraints.
- Nest projects keep value imports for DI-injected types (decorator metadata). `consistent-type-imports` is disabled there via `eslint.nest.mjs`.
- Git: feature branch from `dev`, then a PR into `dev`, then promotion to `stage`, then `main` (production). PR titles follow Conventional Commits. Land cohesive, reviewable PRs per stage. Commits and PRs carry no AI or tool attribution.

## Detailed policies

`docs/engineering/`: `ENGINEERING_STANDARDS.md`, `ARCHITECTURE_RULES.md`, `TESTING_STRATEGY.md`, `SECURITY_STANDARDS.md`, `AI_AGENT_GOVERNANCE.md`, `DEFINITION_OF_DONE.md`. Progress is logged in `docs/implementation-log.md`.

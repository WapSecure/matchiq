# MatchIQ

AI-powered football intelligence, multi-agent analytics and real-time broadcast overlays, built for the **Microsoft × Premier League: Inside the Game** developer hackathon.

> **Synthetic data only.** All teams, players and events are fictional and generated for demonstration. MatchIQ is not affiliated with or endorsed by the Premier League.

MatchIQ ingests football events, computes match state with a deterministic engine, detects explainable key moments, and coordinates specialised AI agents (Microsoft Agent Framework on Microsoft Foundry). Those agents produce evidence-linked narratives, multilingual audience variants and timed broadcast overlays. Every published number traces back to source events.

## Status

Milestone **M0, Foundation**, is complete. See [`docs/implementation-log.md`](docs/implementation-log.md) for verified progress and open items. Features not listed there as done are not implemented yet.

## Architecture

```
synthetic generator → api (ingest, ledger, replay, SSE) → worker (projection, moments, publish gate)
                                                             ↕ FactPacket / AgentResult
                                                        agents (Agent Framework + Foundry)
web (Next.js) ← SSE / REST ← api
```

| Project                   | Stack                                                            |
| ------------------------- | ---------------------------------------------------------------- |
| `apps/web`                | Next.js 16, React 19, Tailwind CSS 4                             |
| `apps/api`, `apps/worker` | NestJS 11, PostgreSQL 17, Redis 8                                |
| `apps/agents`             | Python 3.12, FastAPI, Microsoft Agent Framework, Foundry         |
| `libs/contracts`          | Zod 4. The source of truth, exported to JSON Schema and Pydantic |

Design decisions are in [`docs/adr`](docs/adr). Engineering policies are in [`docs/engineering`](docs/engineering).

## Getting started

Prerequisites: Node 22 (`.nvmrc`), pnpm 10, [uv](https://docs.astral.sh/uv/), Docker.

```bash
pnpm install
(cd apps/agents && uv sync)
cp .env.example .env          # fill in the generated secrets
pnpm infra:up                 # Postgres :54320, Redis :63790, Keycloak :8180
pnpm verify                   # format, lint, typecheck, test, build
pnpm e2e                      # Playwright + axe
```

Run services individually with `pnpm nx serve api`, `pnpm nx serve worker`, `pnpm nx serve agents` and `pnpm nx dev web` (port 4200).

Keycloak is the local OpenID Connect provider (realm `matchiq`, demo accounts in [`docs/security/IDENTITY_AND_ACCESS.md`](docs/security/IDENTITY_AND_ACCESS.md), dev-only password `matchiq-dev-only`). To sign in locally:

1. In `.env`, fill `STREAM_TICKET_SECRET` and `WEB_SESSION_SECRET` (`openssl rand -hex 32`); the OIDC values already point at the local realm.
2. `pnpm seed:fixtures` (templates for `org_demo` and `org_northbank`), then `pnpm nx serve api`, `pnpm nx serve worker` and `pnpm nx dev web`.
3. Open <http://localhost:4200/sign-in>, pick a demo account (for example `harbour.producer` or `harbour.viewer`) and enter the dev-only password.

Without signing in, the app runs as the read-only public demo, as before.

## Branching

Feature branches merge into `dev`, which is promoted to `stage` and then to `main` (production). CI enforces Conventional Commit PR titles and the promotion path.

## License

[MIT](LICENSE)

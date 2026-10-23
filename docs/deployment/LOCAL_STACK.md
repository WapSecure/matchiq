# Local stack

Everything runs on one machine with no cloud account. All published ports are bound to `127.0.0.1`.

## Profiles

| Command                                                         | Starts                                                                                         | Use                                    |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------- |
| `pnpm infra:up` (`docker compose --profile infra up -d --wait`) | postgres (`:54320`), redis (`:63790`), keycloak (`:8180`)                                      | Day-to-day development with `pnpm dev` |
| `docker compose --profile app up -d --build --wait`             | the above, plus `migrate` (one-shot), api `:3000`, worker `:3001`, agents `:8000`, web `:4200` | Full demo from production images       |
| `docker compose --profile ai up -d ollama`                      | ollama `:11434` (CPU)                                                                          | Local model runtime on Linux hosts     |

Without a profile, compose starts only Postgres and Redis. The `infra` profile adds Keycloak. The app profile reuses those same containers and volumes. The app profile was last run end to end during MQ-014 and MQ-022, before sign-in, RLS and Keycloak were added; it has not been re-run since.

The app services are built from `apps/*/Dockerfile`. Each image is multi-stage, runs as a non-root user, has a pinned base image digest and includes a `HEALTHCHECK`.

Start-up order:

1. `migrate` applies `libs/db/migrations` using the api image.
2. The api starts once `migrate` has finished.
3. The worker waits for agents to be healthy.
4. web waits for the api.

Stop the app services and keep the data services running:

```bash
docker compose --profile app stop api worker agents web
docker compose --profile app rm -f api worker agents web migrate
```

`pnpm infra:down` (`docker compose down`) stops everything in the project. Volumes are kept unless you add `-v`.

### Configuration

Compose reads `.env` for **interpolation**. Each service has an explicit `environment:` block with local-only defaults, so the stack also runs without a `.env` file.

`.env` is not passed in whole with `env_file`, for two reasons. First, its `localhost` URLs would override the compose-DNS URLs. Second, `apps/agents/settings.py` rejects the empty `FOUNDRY_PROJECT_ENDPOINT` that `.env.example` ships. `libs/config` now treats blank optional values as unset.

Inside the compose network:

- Services talk to each other by DNS name (`postgres:5432`, `redis:6379`, `http://agents:8000`).
- The browser calls the API on `http://localhost:3000/api/v1`. That address is baked into the web bundle at build time (`NEXT_PUBLIC_API_BASE_URL`).

The default `STREAM_TICKET_SECRET` and `AGENTS_SERVICE_TOKEN` values are placeholders for local use only. Set real ones in `.env` (`openssl rand -hex 32`) for anything shared. The VPS overlay (`infra/vps/compose.vps.yml`) refuses to start without them.

If `pnpm dev` is already using ports 3000, 3001, 4200 or 8000, stop it first. Alternatively, override `API_PORT`, `WORKER_PORT`, `WEB_PORT` or `AGENTS_PORT` in `.env`.

### Liveness checks

```bash
curl -s localhost:3000/api/v1/health/live   # api
curl -s localhost:3001/api/v1/health/live   # worker
curl -s localhost:8000/api/v1/health/live   # agents
curl -s -o /dev/null -w '%{http_code}\n' localhost:4200/   # web
docker compose --profile app ps             # every service shows (healthy)
```

## Models

In compose, the agents container runs `MODEL_PROVIDER=mock`, which gives deterministic templates. ADR-0012 adds `ollama` as a provider. At the time of writing, the `ollama` provider is recorded in the contracts, but `apps/agents` settings accept only `mock` and `foundry`. The compose `ollama` service is therefore ready for that provider, but nothing calls it yet.

- **macOS:** use native Ollama (`brew install ollama`, then `ollama serve`). Docker on macOS cannot use the Apple GPU, so a containerised model runs on CPU only and is much slower. Native Ollama listens on `localhost:11434`. A container reaches it at `http://host.docker.internal:11434`.
- **Linux:** run `docker compose --profile ai up -d ollama`, then `docker compose exec ollama ollama pull <model>`. This runs on CPU. Use a small model (roughly 1–4B parameters) and expect a few seconds per response.
- **Foundry:** run the agents service natively (`pnpm nx serve agents`) after `az login`, with `MODEL_PROVIDER=foundry`, `FOUNDRY_PROJECT_ENDPOINT` and `FOUNDRY_MODEL`. The container has no Azure CLI credentials. This path is unverified until a Foundry project exists (ADR-0003).

## Data, fixtures and replay

These are the commands that exist in the repository today:

```bash
pnpm nx run db:migrate                     # apply migrations to DATABASE_URL from .env (the app profile does this itself)
pnpm generate:fixture --seed 42 --scenario comeback --out fixtures/comeback.json
pnpm validate:fixture fixtures/*.json
```

The five golden fixtures are in `fixtures/` (see `fixtures/README.md`). The API exposes:

- ingest for the `developer` role: `POST /api/v1/fixtures` and `POST /api/v1/fixtures/:fixtureId/events:batch`, with an OIDC access token (see `docs/security/IDENTITY_AND_ACCESS.md`; the operator key is a dev/CI-only fallback behind `AUTH_OPERATOR_KEY_ENABLED`)
- the resumable SSE stream: `GET /api/v1/fixtures/:fixtureId/stream`

There is no one-command seed or replay loader yet. Loading a golden fixture into a running stack, and replay controls, belong to the backend and data workstreams.

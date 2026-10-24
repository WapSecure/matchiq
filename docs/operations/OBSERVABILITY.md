# Observability

Structured logs, OpenTelemetry traces and Prometheus metrics for the API and worker, plus logs and traces for the agents service (ADR-0019). Everything is vendor neutral and local first. With no telemetry settings, the services run exactly as before: JSON logs, tracing off, and metrics on an internal listener.

## Configuration

| Variable                                | Default                               | Effect                                                                                                      |
| --------------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `LOG_LEVEL`                             | `info`                                | `fatal` `error` `warn` `info` `debug` `trace`                                                               |
| `LOG_FORMAT`                            | blank                                 | Blank: `pretty` when `APP_ENV=local`, otherwise `json`                                                      |
| `OTEL_EXPORTER_OTLP_ENDPOINT`           | blank                                 | OTLP/HTTP base URL (for example `http://localhost:4318`). Blank: tracing is off and the SDK is never loaded |
| `OTEL_SERVICE_NAME`                     | `matchiq-api` / `matchiq-worker`      | Trace `service.name`                                                                                        |
| `OTEL_SDK_DISABLED`                     | unset                                 | `true` forces tracing off even with an endpoint                                                             |
| `OTEL_TRACES_SAMPLER`, `_ARG`           | SDK default (parent-based, always on) | Read by the SDK, for example `parentbased_traceidratio` with `0.1`                                          |
| `METRICS_HOST`                          | `127.0.0.1`                           | Bind address of the `/metrics` listener                                                                     |
| `METRICS_PORT`                          | API `9464`, worker `9465`             | `0` disables the listener. Set per service; it is not in the shared `.env`                                  |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | blank                                 | Not exported in-process. Read by the collector's Azure variant (see [Azure Monitor](#azure-monitor))        |
| `COMPOSE_OTEL_EXPORTER_OTLP_ENDPOINT`   | blank                                 | Compose `app` profile only: set to `http://otel-collector:4318` to trace the containerised services         |

`/metrics` is **bound internally, not protected by a token**. The listener is separate from the API port, the reverse proxy (Caddy) routes only the API port, and in compose the port is `expose`d to the network, never published. Do not add a proxy route to it.

## Running the local stack

```bash
pnpm infra:up                                         # Postgres, Redis, Keycloak
docker compose --profile observability up -d          # collector, Tempo, Prometheus, Grafana
# in .env:  OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
pnpm nx serve api; pnpm nx serve worker               # natively, as usual
```

| UI                                                    | Port (127.0.0.1)                                                             |
| ----------------------------------------------------- | ---------------------------------------------------------------------------- |
| Grafana: dashboards, and traces under Explore → Tempo | `3300` (anonymous viewer; admin `admin`/`admin`, override `GRAFANA_ADMIN_*`) |
| Prometheus: targets, alerts                           | `9090`                                                                       |
| OTLP in (gRPC / HTTP)                                 | `4317` / `4318`                                                              |

Prometheus scrapes `host.docker.internal:9464/9465` (native services) and `api:9464` / `worker:9465` (compose `app` profile). The target that is not running shows as down; alerts only need one live target per job. On Linux, the native services must bind `METRICS_HOST=0.0.0.0` (or the Docker bridge address) for the container to reach them; Docker Desktop reaches `127.0.0.1` on the host.

**Viewing a trace:** start a replay in the web app, open Grafana → Explore → Tempo, and search for service `matchiq-api` and span `POST /api/v1/fixtures/:fixtureId/replay`, or search by trace id. Every log line carries `traceId`, so `grep` a request's logs for its id and paste it into Tempo. A replay command trace contains the API's HTTP span, `add replay-commands.replay-command` (producer), `process replay-commands` (worker consumer), the `add`/`process insight-pipeline` job spans and `agents.pipeline` (the CLIENT call that sends `traceparent` to the agents service). A replay tick inherits the context of the command that started the session, so one session's insight jobs appear in that trace.

The configuration is validated statically (`docker compose config`, `promtool check config` and `check rules`, `otelcol validate`). The running stack has not yet been exercised end to end; see the implementation log.

## Logs

One JSON object per line:

```json
{
  "level": "info",
  "time": "2026-10-22T12:00:00.123Z",
  "service": "matchiq-api",
  "version": "0.0.0-dev",
  "env": "dev",
  "requestId": "…",
  "correlationId": "…",
  "orgId": "org_demo",
  "fixtureId": "fx_…",
  "traceId": "…",
  "spanId": "…",
  "context": "Http",
  "msg": "request completed",
  "method": "GET",
  "route": "/api/v1/fixtures/:fixtureId/state",
  "status": 200,
  "durationMs": 4
}
```

- `requestId`: the inbound `x-request-id` if well formed, otherwise a new UUID, echoed in the response.
- `correlationId`: the inbound `x-correlation-id`, or the request id. Worker → agents calls send the agent run's correlation id.
- `orgId` comes from the authenticated principal; `fixtureId` from the route or the job.
- Redaction: secret-named fields are replaced by `[REDACTED]`, and bearer tokens, URL credentials and `Key=value` secrets are scrubbed from messages and stacks (`libs/server-kit/src/lib/telemetry/redaction.spec.ts`). Raw licensed payloads are never logged (there are none: data is synthetic).

## Metrics catalogue

Every series carries `service`. Labels are bounded enums; ids are never labels.

| Series                                         | Type      | Labels                   | Source                                                                                   |
| ---------------------------------------------- | --------- | ------------------------ | ---------------------------------------------------------------------------------------- |
| `matchiq_http_requests_total`                  | counter   | method, route, status    | API and worker, every route (RED)                                                        |
| `matchiq_http_request_duration_seconds`        | histogram | method, route            | API and worker; SSE routes last for the connection                                       |
| `matchiq_sse_connections`                      | gauge     | —                        | API: open SSE streams                                                                    |
| `matchiq_replay_sessions`                      | gauge     | state                    | Worker: loaded sessions by replay state                                                  |
| `matchiq_pipeline_commit_duration_seconds`     | histogram | —                        | Worker: committed pipeline transactions (event-to-state proxy)                           |
| `matchiq_outbox_backlog`                       | gauge     | —                        | Worker: unpublished outbox rows                                                          |
| `matchiq_outbox_oldest_age_seconds`            | gauge     | —                        | Worker: relay lag                                                                        |
| `matchiq_queue_jobs`                           | gauge     | queue, state             | Worker: BullMQ waiting / active / delayed / failed                                       |
| `matchiq_queue_job_duration_seconds`           | histogram | queue, outcome           | Worker: job processing time, completed or failed                                         |
| `matchiq_agent_pipeline_call_duration_seconds` | histogram | outcome                  | Worker: success, timeout, unreachable, http, invalid-response, circuit-open, ai-disabled |
| `matchiq_agent_runs_total`                     | counter   | agent, provider, outcome | Worker: stored agent runs (SUCCEEDED, FAILED, TIMED_OUT, FALLBACK)                       |
| `matchiq_agent_run_duration_seconds`           | histogram | agent, provider, outcome | Worker: latency reported per agent run                                                   |
| `matchiq_insight_completions_total`            | counter   | status, source           | Worker: PUBLISHED / FALLBACK / REJECTED by AGENT or TEMPLATE                             |
| `matchiq_gate_rejections_total`                | counter   | item, source, code       | Worker: publish-gate rejections by issue code                                            |
| `matchiq_retention_deleted_total`              | counter   | kind                     | Worker: rows deleted by retention                                                        |
| `process_*`, `nodejs_*`                        | various   | —                        | prom-client defaults                                                                     |

Counters from the pipeline are recorded only after the transaction commits. A redelivered job whose batch is skipped is not counted twice.

## SLOs

These are the spec's proposed targets (§14, §44, §50), to validate under the documented load (20 events/s across 10 fixtures). The alerts below are not evidence that the targets are met.

The spec gives two insight-to-overlay targets: p95 under 3 s with AI in §14, and at most 4 s in §44 and §50. The alert `MatchiqAgentLatencyHigh` uses 4 s. §44 and §50 come after §23 and so override §14, and the 4 s figure leaves room for the gate and the scheduler on top of a local model call. If the owner prefers 3 s, change the threshold in `infra/observability/alerts.yml` and this table together.

| SLO                                                  | SLI (query basis)                                                                                                          | Alert                                                     |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| API availability 99.9% monthly                       | non-5xx ratio of `matchiq_http_requests_total{service="matchiq-api"}`                                                      | `MatchiqApiErrorBudgetFastBurn` (14.4× burn, 5 m and 1 h) |
| Demo availability ≥ 99% during judging               | `max by (job) (up)`                                                                                                        | `MatchiqServiceDown`                                      |
| Event-to-state p95 < 500 ms locally                  | p95 `matchiq_pipeline_commit_duration_seconds` (proxy)                                                                     | `MatchiqStateUpdateSlow`                                  |
| Stat freshness p95 ≤ 2 s                             | same, plus `matchiq_outbox_oldest_age_seconds`                                                                             | `MatchiqStatFreshnessBreached`, `MatchiqOutboxLagging`    |
| Insight-to-overlay p95 ≤ 4 s with AI, ≤ 1 s fallback | p95 `matchiq_agent_pipeline_call_duration_seconds{outcome="success"}`                                                      | `MatchiqAgentLatencyHigh`                                 |
| 100% published numerical claims evidence-linked      | template rejections in `matchiq_gate_rejections_total{source="TEMPLATE"}` must be 0; agent rejections are the gate working | `MatchiqTemplateFailedGate`                               |
| Repeated model failures                              | non-success share of AI calls                                                                                              | `MatchiqAgentFailuresRepeated`                            |
| Queue backlog                                        | `matchiq_queue_jobs{state="waiting"}`, failed job attempts                                                                 | `MatchiqQueueBacklog`, `MatchiqJobsFailing`               |

Rules: `infra/observability/alerts.yml`. Prometheus evaluates them; no Alertmanager is bundled, so alerts show under Prometheus → Alerts and in Grafana.

## Dashboards

Provisioned into Grafana's **MatchIQ** folder from `infra/observability/grafana/dashboards`:

- **Service RED**: request rate, 5xx ratio, p95 latency per route (SSE excluded), status mix, open SSE connections, targets up, event-loop lag.
- **Replay and outbox health**: sessions by state, pipeline commit p50/p95, outbox backlog and age, queue depth, job p95, retention deletions.
- **Agent pipeline**: AI success rate, calls by outcome, call p50/p95, agent runs by provider and outcome, per-agent p95, completions by status.
- **Publish gate**: rejections by code and by source/item, template rejections (must stay 0), published versus fallback.

## Runbooks

### Stream stalled

Symptoms: `MatchiqOutboxLagging`, `MatchiqStateUpdateSlow`, or viewers see a stale badge.

1. Replay and outbox dashboard: is `matchiq_outbox_backlog` growing? If so, the relays are not publishing. Check Redis health (`/api/v1/health/ready` on both services) and the `OutboxRelay` warnings in the logs.
2. Is commit latency high? Then check Postgres (connections, locks) and `matchiq_replay_sessions{state="PLAYING"}` against `REPLAY_MAX_ACTIVE_SESSIONS`.
3. Viewers reconnect with `Last-Event-ID`; nothing is lost while rows stay in the outbox. Pause the affected sessions if the backlog keeps growing.

### Queue backlog

1. `matchiq_queue_jobs` by queue: `insight-pipeline` waiting jobs mean the model is slow or the concurrency is too low (`AGENT_JOB_CONCURRENCY`). Templates are already on air, so viewers are unaffected.
2. `replay-commands` waiting means the worker is down or stuck: check `MatchiqServiceDown` and the worker logs, filtered by `queue`.
3. Failed jobs: filter logs by `jobId`; the trace shows the failing span.

### Model throttled

Symptoms: `MatchiqAgentFailuresRepeated` or `MatchiqAgentLatencyHigh`.

1. Agent pipeline dashboard: which outcome dominates (timeout, http 429, unreachable)?
2. Lower `AGENT_JOB_CONCURRENCY`. The circuit breaker already falls back to templates (`circuit-open` outcome).
3. If needed, set `AI_ENABLED=false`: deterministic templates only (spec §44 failover).

### Invalid overlay

Symptoms: `MatchiqTemplateFailedGate`, or a producer reports a wrong cue.

1. Retract the cue (`POST /api/v1/overlays/:id/retract`) and freeze the fixture, or use the kill switch (ADR-0016).
2. Publish gate dashboard: which code fired? Template rejections are defects in `apps/worker/src/app/pipeline/templates`.
3. Audit trail and agent-run traces (`correlationId`) show what was proposed.

### API errors

1. Service RED dashboard: which route and status? Filter logs by `route` and `level=error`. 5xx lines carry the stack (redacted) and `requestId`.
2. Paste the `traceId` into Tempo to see the failing dependency span (pg, ioredis, BullMQ).

### Unhealthy endpoint

1. `MatchiqServiceDown`: is the process running? Check `docker compose ps`, or the VPS service manager.
2. `/api/v1/health/ready` lists the failing dependency.
3. For the demo, fall back to the recorded run (spec §14 disaster recovery).

The spec's database-degraded, compromised-credential and licence-expired runbooks (§50, 4 to 6) are procedural and are not tied to these alerts.

## Azure Monitor

Not exercised; do not claim it works (ADR-0003, ADR-0019). The services export OTLP only. To forward traces to Application Insights, run the collector with `infra/observability/otel-collector.azure.yaml` (contrib `azuremonitor` exporter, `APPLICATIONINSIGHTS_CONNECTION_STRING` from the environment) and point `OTEL_EXPORTER_OTLP_ENDPOINT` at it. The services do not use the connection string themselves.

## Limits

- No trace context through the outbox and SSE (it would need a `stream_messages` column and an envelope field). Logs correlate those hops by `fixtureId` and `correlationId`.
- The agents service logs JSON and continues the worker's trace (`POST /api/v1/pipeline/runs` server span under `agents.pipeline`), but its model calls are not yet individual spans, and it has no `/metrics`: agent outcomes and latency are counted by the worker.
- No log shipping (Loki) and no Alertmanager. Logs go to stdout for the platform to collect.
- `matchiq_replay_sessions` counts the sessions loaded in this worker, not every row in the database.

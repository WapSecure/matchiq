# ADR-0017: Telemetry baseline: pino logs, OpenTelemetry traces, Prometheus metrics

- Status: Accepted (2026-10-22). Implements audit item P0-5 (MQ-029) for the API and worker. Refines spec §14 (telemetry), §44 (W3C trace context) and §50 (SLIs, dashboards, runbooks). The agents service follows in a separate change.

## Context

The services had no telemetry. Logs were Nest's plain-text `Logger`, with no request, correlation or trace ids and no redaction. `OTEL_SERVICE_NAME` and `APPLICATIONINSIGHTS_CONNECTION_STRING` were parsed and never used. The spec asks for structured logs without secrets, traces across ingest → aggregate → agent → cue, and metrics for queue depth, fallback rate, SSE connections and rejected claims, with alerts on queue backlog, repeated model failures and an unhealthy endpoint.

Constraints: no paid services; local execution must never depend on a cloud backend; Azure is not provisioned, so nothing Azure-specific may be claimed (ADR-0003, ADR-0007); dependencies are exact-pinned.

## Decision

### Logs: pino behind Nest's `LoggerService`

- `libs/server-kit` wraps `pino@10.3.1` in `PinoLoggerService`. `main.ts` passes it to `NestFactory.create`, so every existing `new Logger(Context)` writes structured lines with no call-site churn. `nestjs-pino` was not used: it brings `pino-http`, and the context we need (organisation from the principal, fixture from the route, BullMQ job ids) is ours anyway.
- Every line carries `service`, `version`, `env`, `context`, and, when known, `requestId`, `correlationId`, `orgId`, `fixtureId`, `queue`, `jobId`, `traceId` and `spanId`. An `AsyncLocalStorage` log context is opened by the request-id middleware and by each BullMQ processor. A global interceptor adds the fixture from the path and the organisation from the authenticated principal, never from client input.
- Redaction runs on every line: secret-named fields (authorization, cookie, password, secret, token, API key, credential, connection string, private key, ticket) are masked, and credential shapes in any string (bearer tokens, URL userinfo, `Key=value` secrets) are scrubbed. The list is unit-tested.
- Output is JSON, except with `APP_ENV=local`, where a small built-in formatter prints readable lines. `LOG_FORMAT` overrides it. `pino-pretty` was not added: it is a runtime transport with its own worker thread.
- One access line per request (method, route template, status, duration) at `info`. Health and metrics routes log at `debug`.

### Traces: OpenTelemetry Node SDK, off unless configured

- `startTracing` lives in its own entry point, `@matchiq/server-kit/tracing`, and runs in `main.ts` before the app module graph is imported (`await import('./bootstrap.js')`), so the http, express, nestjs-core, pg and ioredis instrumentations can patch their modules.
- Tracing starts only when `OTEL_EXPORTER_OTLP_ENDPOINT` is set (and `OTEL_SDK_DISABLED` is not `true`). Otherwise the SDK is never imported, BullMQ gets no telemetry adapter, and the API's no-op tracer makes every span call free. Exporter: OTLP/HTTP to `<endpoint>/v1/traces`. The SDK's metrics and logs exporters are forced off.
- pg and ioredis spans need a parent span, which drops the outbox poll and BullMQ's blocking reads.
- Propagation is W3C trace context:
  - API → worker: `bullmq-otel@1.3.1`, the BullMQ maintainers' implementation of BullMQ's own `Telemetry` interface, stores the context in the job options. Producer and consumer spans link the HTTP request to the job. No job schema changed.
  - Worker → worker (insight jobs) works the same way.
  - Worker → agents: `HttpAgentsClient` opens a CLIENT span and injects `traceparent`, plus `x-correlation-id` (the agent run's correlation id). Injection is explicit, so it works without the undici instrumentation.
  - Outbox and SSE: not propagated. A stream message is written in one transaction and relayed later by a poller, so carrying the context would need a column on `stream_messages` and a field in the SSE envelope. That is deferred. The spec's `traceId` on the event envelope remains future work. Logs correlate these hops by `fixtureId` and `correlationId`.
- Azure: no in-process Azure exporter. `@azure/monitor-opentelemetry-exporter` brings the Azure core stack into every image for a backend that is not provisioned. The seam is the collector: `infra/observability/otel-collector.azure.yaml` routes the same OTLP stream to Application Insights through the contrib `azuremonitor` exporter. If only `APPLICATIONINSIGHTS_CONNECTION_STRING` is set, the service logs that notice at boot. This path is not exercised and must not be claimed.

### Metrics: prom-client on an internal listener

- `prom-client@15.1.3`, with one `Registry` per application instance (never the global one, so several apps in one test process do not collide), the `service` default label, and the Node and process defaults.
- `/metrics` is served by a separate `node:http` listener on `METRICS_HOST:METRICS_PORT` (API 9464, worker 9465, default host `127.0.0.1`), not on the public API port. Decision: **bind internally rather than protect with a token**. The reverse proxy only routes the API port, so the endpoint is unreachable from outside without any secret to rotate. In compose, `METRICS_HOST=0.0.0.0` with `expose` (not `ports`) makes it reachable on the compose network only. `METRICS_PORT=0` disables it.
- Labels are bounded enums only: method, route template (`req.route.path`, or `unmatched`), status code, queue, state, agent, provider, outcome, gate issue code, source and retention kind. Ids never become labels.
- Worker series are recorded where they already funnel. A metered `PipelineUnitOfWork` decorator observes completions (with gate reports) and agent runs, and reports them only after the transaction commits. `InsightPipelineService` records each call's outcome and latency. BullMQ `completed` and `failed` events give job durations. Gauges (sessions by state, queue depth, outbox backlog and age, SSE connections) are read at scrape time, and a failing read keeps the last value instead of failing the scrape.

### Local stack

An optional `observability` compose profile: OTel Collector (contrib 0.162.0), Tempo 2.10.8, Prometheus v3.15.0 with alert rules, and Grafana 13.0.10 with provisioned dashboards. Every image is pinned by tag and digest, and every port binds to `127.0.0.1`.

## Consequences

- Turning telemetry on is a configuration change. With nothing set, the services behave as before, apart from JSON logs and the metrics listener.
- New production dependencies are in `libs/server-kit`: pino, prom-client, `@opentelemetry/api` 1.9.1, `sdk-node` 0.223.0 with its 2.12 core line, the http/express/nestjs-core/pg/ioredis instrumentations, and bullmq-otel. The 0.300/3.x OpenTelemetry line was two days old and needs a newer API peer, so it was not used.
- The SLO alerts are proposals (§14, §44, §50) evaluated against proxies. Pipeline commit latency stands in for event-to-state latency. They are not evidence that the targets are met.
- The agents service needs a matching change (JSON logs, FastAPI tracing that reads `traceparent`) before one trace spans worker → agents internals. Until then the worker's CLIENT span ends the trace.

# ADR-0030: Usage metering and billing are deferred

- Status: Accepted as a deferral (2026-10-23). Spec §51, §45. Recorded by MQ-067. Numbers 0030 to 0036 were chosen to avoid collisions with ADRs that parallel work may add.

## Context

Spec §51 asks for a usage ledger (`fixture_minutes_processed`, `ingested_events`, `insight_generations`, model tokens, `API_calls` and more), quota responses, usage export and invoice reconciliation. §45 lists `GET /v1/usage` behind `billing:read`. The spec itself says the hackathon build needs cost telemetry, not a payment gateway.

## Decision

Usage metering, the immutable usage ledger, quotas, usage export and billing are deferred until after the hackathon. What exists today is cost telemetry only: `AgentRun.costEstimateUsd` from `AGENT_PRICE_TABLE` (local inference and the mock record 0), and the OpenTelemetry and Prometheus metrics of ADR-0019. The `billing:read` permission is in the access matrix and guards no route ("reserved").

## Consequences

- No customer can see or export usage, no quota stops a tenant, and nothing can be invoiced.
- MatchIQ must not claim metering, budgets or margin figures. Any unit-economics number in a document is illustrative.
- Cost telemetry is per agent run, not per tenant or per meter, so it cannot be reconciled to an invoice.

## What it would take

- A `usage_records` table (orgId, product, meter, quantity, unit, sourceId, timestamp, pricingVersion) with a unique `sourceId`, written by the API, worker and agents client.
- Meters emitted at the points in §51, retried safely so a retry never double counts.
- Per-tenant quotas with an explicit 429 and a deterministic fallback.
- `GET /v1/usage` and an export, guarded by `billing:read`, with tests for double billing and quota exhaustion.
- A pricing version and a reconciliation job against provider invoices.

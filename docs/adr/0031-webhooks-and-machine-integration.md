# ADR-0031: Webhooks and machine-to-machine integration are deferred

- Status: Accepted as a deferral (2026-10-23). Spec §45, §40, §48. Recorded by MQ-067. Numbers 0030 to 0036 were chosen to avoid collisions with ADRs that parallel work may add.

## Context

Spec §45 describes signed webhooks (HMAC SHA-256, timestamp tolerance, secret rotation, replay protection), a typed TypeScript SDK with retries for safe operations and exponential backoff with jitter, an error taxonomy, and per-tenant rate limits (429 with `Retry-After`). §40 says machine clients use OAuth2 client credentials.

## Decision

Webhooks, the SDK, SDK retry and backoff, per-tenant rate limits and OAuth2 client-credentials machine clients are deferred until after the hackathon. Integrators use the REST API, the generated OpenAPI document (ADR-0017), SSE with `Last-Event-ID` and `Idempotency-Key` on writes. The only machine path today is the optional operator key, which is disabled by default (ADR-0018).

## Consequences

- There is no push delivery to a customer system, so a partner must hold an SSE connection or poll.
- There is no published client library and no documented retry policy for integrators.
- Abuse is limited by replay capacity (ADR-0015) and request-size limits, not by per-tenant rate limits.
- Outbound webhooks add an SSRF surface; the threat model lists it as a residual risk and it needs controls before webhooks ship.

## What it would take

- A `webhook_endpoints` and delivery table with signed payloads, timestamp tolerance, secret rotation and a dead-letter queue.
- An egress allowlist and address-range checks on endpoint URLs.
- A rate limiter keyed by organisation with `Retry-After`.
- A generated TypeScript SDK with retries, backoff with jitter, an error taxonomy and consumer contract tests against the OpenAPI document.
- Client-credentials service identities in the identity provider, scoped per tenant.

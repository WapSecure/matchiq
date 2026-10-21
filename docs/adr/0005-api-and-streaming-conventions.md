# ADR-0005: API and streaming conventions

- Status: Accepted (2026-10-21). Resolves `/fixtures` (§11, §45) vs `/matches` (§29).

## Decision

- REST lives under `/api/v1`, with resources named `fixtures`. Errors are RFC 9457 problem details with `type = urn:matchiq:problem:<slug>`. Requests carry `x-request-id`, and writes carry an `Idempotency-Key`.
- Viewers use SSE (`/api/v1/fixtures/:id/stream`). The SSE `id` is `streamSequence`; clients resume with `Last-Event-ID` and fall back to a snapshot on gaps. Message types are defined by `StreamMessage`.
- Delivery is at least once and every consumer is idempotent. Exactly-once is never claimed.

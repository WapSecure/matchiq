# ADR-0006: Persistence and messaging

- Status: Proposed. To be confirmed by the M1 ingest PR.

## Decision

- PostgreSQL 17 is the authoritative event ledger and state store, with `UNIQUE(org_id, fixture_id, sequence)` and `UNIQUE(org_id, fixture_id, event_id)`.
- A transactional outbox feeds Redis (BullMQ for jobs, pub/sub for SSE fan-out). Queue and broker access sit behind ports, so Azure Service Bus can replace BullMQ without domain changes.
- Proposed ORM: Drizzle (SQL-first, reviewable numbered migrations). The alternative, Prisma, was rejected because its migration engine and generated client add opacity for a constraint-heavy schema.

# ADR-0006: Persistence and messaging

- Status: Accepted (2026-10-21). Confirmed by the M1 ingest PR (MQ-004, MQ-006).

## Decision

- PostgreSQL 17 is the authoritative event ledger and state store, with `UNIQUE(org_id, fixture_id, sequence)` and `UNIQUE(org_id, fixture_id, event_id)`.
- A transactional outbox feeds Redis (BullMQ for jobs, pub/sub for SSE fan-out). Queue and broker access sit behind ports, so Azure Service Bus can replace BullMQ without domain changes.
- ORM: Drizzle (SQL-first, reviewable numbered migrations). The alternative, Prisma, was rejected because its migration engine and generated client add opacity for a constraint-heavy schema.

## Implementation notes (M1)

- `libs/db` holds the Drizzle schema, the numbered SQL migrations in `libs/db/migrations`, the repository ports and their Postgres and Redis adapters. `pnpm nx run db:migrate` applies migrations to `DATABASE_URL`; `pnpm nx run db:generate-migration` generates the next one from the schema.
- `stream_messages` is both the outbox and the SSE replay log. Each row carries a per-fixture `stream_sequence` allocated by incrementing `fixtures.stream_head` inside the writing transaction. The row lock on the fixture serialises writers, so stream sequences commit in order and a visible sequence N implies every lower sequence is already readable.
- The relay claims unpublished rows with `FOR UPDATE SKIP LOCKED`, publishes them to `"{REDIS_KEY_PREFIX}:stream:{orgId}:{fixtureId}"` and marks them published in the same transaction. A crash between publish and commit republishes rows, so delivery is at least once and SSE sessions deduplicate by `streamSequence`.
- The relay runs in the API process (`OUTBOX_RELAY_ENABLED`) so that ingest can nudge it right after commit. It is safe to run in several processes at once, so it can also move to the worker without schema changes.

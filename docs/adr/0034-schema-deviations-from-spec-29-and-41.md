# ADR-0034: Schema deviations from the spec data model are accepted

- Status: Accepted as a deferral (2026-10-23). Spec §29, §41. Recorded by MQ-067. Numbers 0030 to 0036 were chosen to avoid collisions with ADRs that parallel work may add.

## Context

Spec §29 and §41 describe a normalised relational model: `organizations`, `memberships`, `provider_contracts`, `fixtures`, `players`, `events` with `correction_of`, `snapshots` unique on `(through_seq, algorithm_version)`, `outbox`, and numbered reversible migrations with a rehearsed rollback. MatchIQ was built to the earlier ADRs (0004, 0006, 0008) first.

## Decision

Three deviations are accepted for now and deferred until after the hackathon: (1) teams and players live inside the fixture payload (`fixtures.payload` JSONB) with no `teams` or `players` tables; (2) `match_snapshots` holds only the latest projection per fixture (primary key `(org_id, fixture_id)`), with no snapshot history and no `algorithm_version` key; (3) migrations are forward-only SQL files in `libs/db/migrations`, and a rollback is a restore.

## Consequences

- Player and team queries across fixtures need JSON queries, and player identity is per fixture, not canonical.
- A past snapshot cannot be read back or compared across algorithm versions. The state is rebuilt by replaying the ledger, which ADR-0008 makes deterministic.
- A bad migration is undone by restoring a backup, not by a down migration. Rollback has not been rehearsed.
- The `events.correction_of` column of §41 has no equivalent yet; corrections are tracked as a separate ticket (MQ-063).

## What it would take

- `teams` and `players` tables with canonical ids and a backfill from fixture JSONB.
- A `match_snapshots` history keyed by `(org_id, fixture_id, through_sequence, algorithm_version)` with a retention rule (ADR-0015).
- Paired down migrations and a rollback rehearsal on a synthetic snapshot in CI.
- Foreign keys that keep tenant consistency across the new tables.

## Amendment (MQ-085)

The spec's `insight_evidence` table is still not created. Evidence stays inside `insights.payload` and is served on its own by `GET /insights/{insightId}/evidence`, so the deviation no longer hides the evidence from clients.

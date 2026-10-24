# ADR-0015: Replay session capacity, idle eviction and data retention

- Status: Accepted (2026-10-22). Refines ADR-0013 (sessions) and ADR-0006 (persistence). Implements MQ-022.

## Context

The hosted demo is anonymous (ADR-0010), so sessions are started and abandoned at will. Under ADR-0013 the worker counted every loaded runner that was not `COMPLETED` against `REPLAY_MAX_ACTIVE_SESSIONS`, and nothing evicted `PAUSED` runners. A worker restart also reloaded every `PAUSED` session. After ten abandoned sessions the worker dropped each new start command with a log line, while the API had already answered `201`. Nothing was ever deleted, so `stream_messages`, `match_events` and `idempotency_keys` grew without bound.

## Decision

### What holds a slot

A session holds a replay slot while it is `PLAYING`, or while it is `IDLE` right after creation, when its start command is in flight. `PAUSED` and `COMPLETED` sessions never hold one. The same rule is applied in two places:

- **API (primary check).** It counts persisted `replay_sessions` in `PLAYING` or `IDLE` whose `updated_at` is within `REPLAY_IDLE_TIMEOUT_MS` (database time). `POST /fixtures/:id/sessions` checks and creates under a per-org advisory transaction lock, so concurrent creates cannot both take the last slot. `start` and `resume` commands run the same check, leaving out the session itself. At the limit the API answers RFC 9457 `503 urn:matchiq:problem:replay-capacity` with `Retry-After: 30`, and nothing is created or queued.
- **Worker (backstop).** It counts loaded runners in `PLAYING` or `IDLE`. A `start` or `resume` that would exceed the limit is not applied. In one transaction the worker writes the session's unchanged status to its stream as `replay.status` and adds an audit row (`replay.command.rejected`, reason `replay-capacity`). A client waiting for `PLAYING` therefore settles on the real state; the web already falls back to a REST status read.

The freshness window means an `IDLE` session that never starts, or a `PLAYING` session whose worker died, stops counting after the idle timeout. A slot can never stay stuck.

### Idle eviction and restarts

- A sweep (every `min(REPLAY_IDLE_TIMEOUT_MS, 60 s)`) removes runners that are not `PLAYING`, are not writing, and have been untouched for the idle timeout. Their state is already durable. The next command reloads the runner from the ledger: the persisted speed is restored and the pipeline state is rebuilt silently, as on boot.
- On boot the worker resumes only sessions persisted as `PLAYING`, most recently active first, up to the limit. Any over the limit are paused durably with a `replay.status`. `PAUSED` sessions load on demand.

### Idempotent replay commands

`POST /fixtures/:id/sessions` and `POST /fixtures/:id/replay` honour `Idempotency-Key` (ADR-0005, spec §29) through the existing `idempotency_keys` store. The key is claimed in its own transaction, which blocks a concurrent duplicate, and is stored with the response only after the command is queued. The same key with the same body returns the stored response with `Idempotent-Replayed: true`. The same key with a different body answers `422 idempotency-key-reused`, as ingest does. A failed attempt stores nothing, so a retry runs again.

### Retention

The worker runs a retention pass every `RETENTION_INTERVAL_MS` (and once at boot) under a Postgres session advisory lock, so only one replica deletes at a time. Sessions untouched for `SESSION_RETENTION_DAYS` (default 7) are deleted in batches of 10 per transaction, with every dependent row. Idempotency keys older than `IDEMPOTENCY_RETENTION_HOURS` (default 24) are pruned in batches of 1,000. Each batch writes an audit row with exact counts. Templates and audit events are never deleted. Migration `0002_session_retention` adds `ON DELETE CASCADE` to every fixture foreign key as a safety net behind the explicit ordered deletes, plus indexes for the activity count, the retention scan, key pruning and pending insights. See `docs/operations/DATA_RETENTION.md`.

### Ledger immutability (amended by MQ-063)

`match_events` is append-only at the database level (migration `0008_ledger_immutability`). A trigger refuses every `UPDATE`, and every `DELETE` unless the transaction-local flag set by `purge_match_ledger(org_ids, fixture_ids)` is on. `UPDATE` and `DELETE` are revoked from `matchiq_app`, and the function has no `PUBLIC` execute grant, so only the owner role used by retention can remove a ledger, and only whole fixtures at a time. Corrections are always new `CORRECTION` events. A fixture delete that would cascade into a non-empty ledger fails, which is why retention purges the ledger first.

### Boot recovery of PENDING insights

On boot the worker re-examines insights left `PENDING`. Within the agents deadline (`(AGENT_MAX_RETRIES + 1) × (AGENT_TIMEOUT_MS + grace)` plus backoff) the pipeline job is enqueued again. BullMQ deduplicates by job id, so a live job is not duplicated. Past the deadline, or with AI disabled, the deterministic templates are published and the recap is rebuilt. Publication is claimed in the write transaction, so racing a live job never publishes twice.

## Alternatives considered

- **Mark abandoned sessions `COMPLETED` or a new `ABANDONED` state.** Rejected: it changes the `ReplayState` contract that the web and generated models share, and it would end a session a judge may come back to. Eviction frees memory, the freshness window frees the slot, and the session can still resume.
- **A new `FAILED` replay state for rejected commands.** Rejected for the same contract reason. Re-announcing the real status plus an audit row is honest, and it needs no client change.
- **Synchronous API → worker capacity query.** Rejected: it adds a request/reply channel. Persisted state is the API's source of truth everywhere else (ADR-0013).
- **Cascade-only deletes.** Rejected as the only mechanism: Postgres does not report cascaded row counts, and the audit needs exact counts.

## Consequences

- A `PLAYING` session at 1× holds a slot until the match ends (up to about 90 minutes of wall time, with dead time compressed) even with no viewers. Viewer-presence eviction is future work.
- Retention deletes by `replay_sessions.updated_at`, so any command or written batch extends a session's life.
- Capacity is per org (`DEMO_ORG_ID`) and still assumes one worker replica (ADR-0013).

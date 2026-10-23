# Data retention

Policy for the data MatchIQ stores, and how it is enforced. Decision record: ADR-0015. Spec §41 and §48 call for retention enforced per tenant and licence. Today one org (`DEMO_ORG_ID`) and one policy apply. Per-tenant schedules are future work (audit P1-15).

All match data is synthetic. Replay controls are anonymous, and audit rows for them record `anonymous-viewer` or a system actor, never an IP. Signed-in actions are different: since migration `0007_audit_actor_display_name`, an audit row written for a signed-in user holds that user's id (`actor`), their roles and their display name (`actor_display_name`). These are personal data. Audit rows are kept indefinitely and are not pruned; there is no subject-access or deletion workflow yet (ADR-0036), so identity-bearing audit rows can only be removed by an operator with database access.

## Schedule

| Data                                                                                                                                                                                                     | Kept for                                                         | Mechanism                                                                                            |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Replay sessions and everything that belongs to them: the session fixture, `match_events`, `stream_messages` (outbox and SSE history), insights, narratives, overlay cues, agent runs, snapshot and recap | `SESSION_RETENTION_DAYS` (default **7**) after the last activity | Worker retention job                                                                                 |
| `idempotency_keys`                                                                                                                                                                                       | `IDEMPOTENCY_RETENTION_HOURS` (default **24**)                   | Worker retention job                                                                                 |
| Fixture templates (`fixture_templates`, loaded from `fixtures/*.json`)                                                                                                                                   | Indefinitely                                                     | Never deleted; re-seeded idempotently                                                                |
| `audit_events`, including the retention job's own records                                                                                                                                                | Indefinitely                                                     | Not pruned (spec §48 audit retention). Rows for signed-in users hold user id, roles and display name |
| Operator-created fixtures (`POST /fixtures`) that are not replay sessions                                                                                                                                | Indefinitely                                                     | Out of scope until tenancy lands (ADR-0007)                                                          |
| BullMQ job records in Redis                                                                                                                                                                              | Latest 1,000 completed and 1,000 failed per queue                | `QUEUE_RETENTION` in `libs/db`                                                                       |

"Last activity" is `replay_sessions.updated_at`. Every command, status change and written event batch moves it forward, so a session that is still in use never expires. Completed and abandoned sessions (`IDLE`, `PAUSED`, or `PLAYING` with a stopped worker) all expire the same way.

## How the job runs

- `RetentionService` in the worker runs once at boot and then every `RETENTION_INTERVAL_MS` (default 1 h). Set `RETENTION_ENABLED=false` to turn it off.
- Each run takes a Postgres session advisory lock (`matchiq:retention`). A replica that cannot get the lock skips the run, so only one process deletes at a time.
- Expired sessions are deleted 10 per transaction, oldest first, with at most 100 batches per run. A later run continues the backlog. Dependent rows are deleted explicitly, children first, so exact counts can be recorded. The fixture foreign keys are `ON DELETE CASCADE` (migration `0002_session_retention`) as a safety net if a table is added later.
- Loaded runners for purged sessions are released from worker memory first.
- Idempotency keys are pruned 1,000 per statement.

## Audit

- Each deleted batch writes `retention.sessions.purged` (target `retention / replay_sessions`) in the same transaction as the deletes. The row lists the session ids and per-table row counts.
- A run that removed anything writes a summary `retention.run` with both cutoffs, the totals and the number of pruned idempotency keys. Runs that remove nothing write no audit row.

Example query:

```sql
select created_at, action, details
from audit_events
where action like 'retention.%'
order by created_at desc
limit 20;
```

## Configuration

| Variable                      | Default   | Range           |
| ----------------------------- | --------- | --------------- |
| `RETENTION_ENABLED`           | `true`    | `true`, `false` |
| `SESSION_RETENTION_DAYS`      | `7`       | 1–365           |
| `IDEMPOTENCY_RETENTION_HOURS` | `24`      | 1–720           |
| `RETENTION_INTERVAL_MS`       | `3600000` | 1 s – 24 h      |

## Operating notes

- Shortening `SESSION_RETENTION_DAYS` takes effect on the next run. Rows deleted by retention cannot be recovered except from a database backup.
- To keep a session for a demo, interact with it (any command refreshes its activity) or raise the retention window.
- Deleting a session removes its SSE history. A client that still holds its URL gets `404 replay-session-not-found`.

# ADR-0013: Replay sessions and the intelligence pipeline

- Status: Accepted (2026-10-21). Implements MQ-010 and MQ-013 and wires MQ-005/007/009 end to end. Refines spec §11, §13, §24, §26, §28, §29, §44 and §45.

## Context

Judges must start the demo fixture anonymously, at a chosen speed, and every viewer of that replay must see the same stream. The ledger is append-only (ADR-0006), replay determinism covers events, snapshots and overlay decisions (ADR-0008), the deterministic gate is the only commit authority (ADR-0002) and the product must work with AI disabled.

## Decision

### Templates and sessions

- `fixtures/*.json` are loaded by `pnpm seed:fixtures` into `fixture_templates` after `validateFixtureFile` (schema, invariants, manifest hash and score). Seeding is idempotent: an unchanged events hash writes nothing. Templates are not fixtures and have no ledger.
- Starting a replay creates a **session**: a new fixture `<templateId>_s<n>` (same teams, title and provenance, status `LIVE`), a `replay_sessions` row linking it to its template and an `IDLE` `replay.status` message, in one transaction that locks the template row so concurrent starts get distinct numbers. The worker feeds the template's events into the session ledger, with only `fixtureId` rewritten.
- One session is one deterministic stream for every viewer. Restart means a new session. Seeks are **forward only**: the worker fast-forwards ingestion to the target. Scrubbing backwards is a client concern over events already received. `GET /fixtures` keeps listing fixtures (sessions included); the lobby uses `GET /fixture-templates` and `GET /replay-sessions` instead of a discriminator on fixtures, so the fixture contract stays unchanged.

### Commands

- The API validates a command against the session's persisted status with the same transition table as `ReplayController` (409 `replay-state-conflict` otherwise), queues it on the BullMQ `replay-commands` queue behind the `ReplayCommandBus` port and answers 202 with the predicted status. The worker is the authority: its `replay.status` messages confirm the real state.
- Replay controls are anonymous but have their own per-client throttler (`REPLAY_RATE_LIMIT_PER_MINUTE`, default 30) on top of the global one (ADR-0010).

### Worker pipeline

One `SessionRunner` per session owns a `ReplayController` (system scheduler in production, `ManualScheduler` in tests) and a single serial queue. Events, status changes and agent publications are processed in queue order and written in batches of at most 100 events, each batch in one transaction (`PipelineWriter`):

1. The ledger append (`appendReplayedEvents`, which skips anything at or below the stored head so a retried batch is a no-op) together with the `match.event` messages.
2. Projection with the engine. `match.snapshot` on `MATCH_STARTED`, `PERIOD_*`, `MATCH_ENDED`, `GOAL`, `CARD`, `SUBSTITUTION` and `CORRECTION`, otherwise at most every 10 events or 15 s of match clock (`SNAPSHOT_CADENCE`). At 30× that is about two snapshots a second.
3. `stepMoments` → `insight.detected`, persisted in `insights`.
4. A deterministic overlay cue derived from the insight (kind, priority and duration from constants, copy from the broadcast template), run through the gate and the overlay scheduler.
5. With `AI_ENABLED=false`, 3 personas × 3 locales of template narratives, gated and published as `narrative.ready` with an `AgentRun` of provider `template` and outcome `FALLBACK`. With AI enabled, the insight stays `PENDING` and a BullMQ `insight-pipeline` job is enqueued after commit (job id `fixtureId__insightId__revision`, `AGENT_MAX_RETRIES + 1` attempts with exponential backoff, `AGENT_JOB_CONCURRENCY` workers).
6. At `MATCH_ENDED` the recap is built from the committed read models and stored in `match_recaps`. It is rebuilt when a late agent publication lands for a completed session.

Every decision depends only on the event stream, never on wall time, so the same session produces an identical stream at any speed apart from `emittedAt`, `createdAt` and the speed carried by `replay.status`. A restarted worker rebuilds a session's state by stepping the pipeline silently over the stored ledger, then resumes it.

### Agents and the publish gate

- The job calls `POST {AGENTS_SERVICE_URL}/api/v1/pipeline/runs` with a `PipelineRequest` (the insight's `FactPacket`, the fixture's entity allowlist, all personas and locales, `deadlineMs = AGENT_TIMEOUT_MS`, `policyVersion`). Timeouts, 5xx and 429 are retried. Other 4xx responses, invalid bodies, an open circuit breaker (`AGENT_CIRCUIT_FAILURE_THRESHOLD`, `AGENT_CIRCUIT_COOLDOWN_MS`) or the last failed attempt publish templates instead. Replay never waits for the model.
- The gate (`publish-gate.ts`) re-checks every draft and the overlay proposal. It mirrors the agents service checker so that the worker stays authoritative:
  - `verifyCitedValues` against the envelope, and every numeral in the text (digits and spelled-out numbers) must be a cited value.
  - `verifyEvidenceIds`, plus at least one triggering event cited.
  - Capitalised tokens (except the first word of a sentence) must belong to the entity allowlist or a short glossary.
  - Persona length limits (casual: one sentence and at most 200 characters; broadcast: 60/140) and contract limits.
  - Only requested persona × locale variants pass.
- Only passing items are published. Rejections are stored with codes and details in `insights.gate_report`, and rejected or missing variants fall back to templates, so each insight always has 9 narratives.
- Publication is claimed in the write transaction (`insights.publication` moves out of `PENDING` once), so at-least-once job delivery never publishes twice.

### Overlays

The overlay scheduler holds one broadcast slot on the match clock (spec §26, §44). A cue starts at the insight's `matchClockMs` with `clockEndMs = start + duration` (6–10 s by kind) and `maxDisplayMs = 12 s`. It uses the spec §26 safe area and status `AUTO_APPROVED`. A higher-priority cue supersedes the live one after a 3 s minimum dwell; others queue (at most 4), and a queued cue is dropped as stale after 20 s. Repeated insights are ignored. The live cue expires when the clock passes `clockEndMs` or the period ends, and each end emits `overlay.retract`.

An agent overlay proposal that passes the gate updates the copy of the cue as revision 2 if that cue is still live, and keeps the deterministic timing. Selection and timing therefore stay deterministic (ADR-0008), and a slow model never yields a stale graphic. At 30× a 7 s cue lasts about 230 ms of wall time, so clients may hold a cue for a minimum real-time display.

### Corrections downstream (amended by MQ-063)

A `CORRECTION` (VOID) or a late event refolds the projection (ADR-0002), and the moment detector follows. `MomentTracker` re-runs the engine's `redetectMoments` over the corrected ledger whenever the event is a CORRECTION, arrives out of order or was already voided, and diffs by `insightId`. A moment that no longer holds goes through the editorial retraction path of ADR-0016 with cause `CORRECTION`, in the same batch transaction:

- `insight.retract` (`insightId`, `cause`, `causeEventId`, `reason`) on the stream;
- the live cue ends with `overlay.retract` (`cause: CORRECTION`), and a queued cue is dropped, so it never airs. The scheduler learns this from the stream itself, so its decisions stay a pure function of the events;
- the insight becomes `REJECTED` with editorial state `RETRACTED`, its narratives get `retracted_at` and are no longer served, and its cue row is marked `RETRACTED`, so no later agent revision or publication goes out;
- one audit row `insight.retracted` (actor `system:worker`, type `SYSTEM`).

New moments from a re-scan flow through the normal pipeline, but a cue airs only while the moment is current. A retracted id is never re-admitted. The same event sequence gives the same retractions, so replays and restarts stay deterministic. The recap keeps a retracted moment, marked, without narratives.

## Alternatives considered

- **Replay the template fixture in place.** Rejected: an append-only ledger cannot be replayed twice, and viewers starting at different times would interfere.
- **Synchronous API → worker request/reply** for exact status in the 202. Rejected: it adds a second Redis channel and a timeout path. Persisted-state validation plus the authoritative `replay.status` is simpler and honest.
- **Publish overlays only from agent proposals when AI is on.** Rejected: model latency (seconds) exceeds a cue's lifetime at 20–30×, so most cues would be stale.
- **Narratives through the job even with AI off.** Rejected: it would make the AI-off stream order depend on queue timing and break the determinism tests.

## Consequences

- New tables (`0001_replay_intelligence`): `fixture_templates`, `replay_sessions`, `insights`, `narratives`, `overlay_cues`, `agent_runs`, `match_snapshots`, `match_recaps`. All carry `org_id` (ADR-0007).
- Sessions are driven by a single worker replica. Several replicas would need session ownership (for example a per-session queue group), which is future work.
- `ReplaySessionView`, `FixtureTemplateSummary`, `RecapDocument`, `InsightTrace`, `GateReport` and `{ items }` lists are local types in `libs/db` until the platform lead adds them to `libs/contracts`.

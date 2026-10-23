# ADR-0016: Editorial control, kill switch, audit trail and the permission seam

- Status: Accepted (2026-10-22). Implements the backend of MQ-017 (subset) and audit item P0-4. Refines spec §5, §26, §28, §40, §41, §44, §45, §48 and §50 (runbook 3). Builds on ADR-0002, ADR-0005, ADR-0010 and ADR-0013.

## Context

Every cue was `AUTO_APPROVED` and stayed on air until the scheduler ended it. Spec §5 requires a cue to be "removable instantly", §44 that a "producer can pause/retract with audit trail", §48 a tested cue kill switch, and §40 an audit row with actor, tenant, correlation and before/after for every privileged action. Two other constraints apply. Replay determinism (ADR-0008) needs the scheduler's decisions to depend only on the event stream. Identity is still the shared operator key (ADR-0010), but real RBAC must be able to replace it without changes to controllers.

## Decision

### Editorial model

- **Retract** (`POST /api/v1/overlays/:overlayId/retract`, `editorial:publish`): this takes a cue that is `LIVE` off air. In one transaction, under the fixture row lock, it sets `overlay_cues.status = RETRACTED` and `editorial_state = RETRACTED`, appends `overlay.retract` with `cause: PRODUCER` to the outbox, and writes the audit row. If the cue was already retracted by a producer, the call answers `200` with `changed: false` and writes nothing. A cue that has expired, been superseded or never aired answers `409 overlay-not-on-air`.
- **Suppress** (`POST /api/v1/insights/:insightId/suppress`, `editorial:approve`): this applies to an insight whose narratives are still `PENDING`, which happens with AI enabled. The insight becomes `REJECTED` with `editorial_state = SUPPRESSED`. `claimPublication` and `pendingInsight` skip suppressed insights, so a late agent result is never published. If the insight's cue is on air, it is retracted with `cause: INSIGHT_SUPPRESSED`. An already-published insight answers `409 insight-already-published`; use retract for its cue.
- **Freeze / resume** (`POST /api/v1/fixtures/:fixtureId/editorial/freeze|resume`, `editorial:publish`): this sets the session's `FIXTURE` control row and announces `editorial.status`. A freeze does not clear the air: the live cue runs out, or a producer retracts it, following runbook 3: "retract, freeze auto-publish".
- **Kill switch** (`POST /api/v1/editorial/kill-switch/activate|release`, `editorial:publish`: producers own on-air decisions in the ADR-0018 matrix): this sets the organisation's `ORG` control row. Activation then locks every active session, in fixture-id order, and does three things in the same transaction: it retracts each live cue (`cause: KILL_SWITCH`), announces `editorial.status`, and writes one audit row per retraction plus one for the switch. At most 100 sessions are handled, which matches the session list cap.
- **Reads**: `GET /fixtures/:id/editorial` and `GET /editorial/kill-switch` are public. They carry the mode and `changedAt` only. The actor and the reason stay in the audit trail.
- **Idempotency**: every command accepts `Idempotency-Key` (spec §45). Repeating a command whose target is already in the requested state is also a no-op (`changed: false`, `auditId: null`), so a retry without a key is safe too.

### The publish path stays deterministic

The overlay scheduler is unchanged and still a pure function of the stream. Inside the batch transaction, after the fixture lock, `PipelineWriter` reads the editorial view (controls, cue states, suppressed insights) and applies `applyEditorialPolicy`. This is the "editorial policy" stage of spec §46:

| Situation                                           | Result                                                                                                                                         |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `FROZEN` or `KILLED`, new cue                       | No `overlay.publish`. The row is stored as `VERIFIED` and `HELD`, with `EDITORIAL_FREEZE` or `KILL_SWITCH` as the reason. Audit `overlay.held` |
| `FROZEN` or `KILLED`, new revision of an on-air cue | Revision withheld. The on-air row is kept. Audit `overlay.blocked`                                                                             |
| Cue retracted, held or suppressed                   | Every later revision and end is dropped. A retracted cue is never re-shown, including after a revision-2 agent update                          |
| Cue of a suppressed insight                         | Held as `SUPPRESSED`                                                                                                                           |
| Scheduler supersede                                 | Published as before. Audit `overlay.retracted` (actor `overlay-scheduler`)                                                                     |
| Agent drafts rejected by the gate                   | Published as before. Audit `publication.gated` with codes and correlation id                                                                   |

Narratives and insights are never held: "while frozen, no `overlay.publish`, but narratives still publish". Held cues are excluded from `GET /fixtures/:id/overlays`, because viewers see only what aired. They appear in the observatory (`agent-runs[].editorial`). **Resume releases nothing retroactively.** The spec names no release semantics, and a held cue is stale by the time a producer resumes. With no producer actions the stream is byte-identical to before, and the determinism and golden tests are unchanged.

Every editorial command takes the same fixture row lock as the worker's batch write. That makes "retract, then a revision lands" strictly ordered. The worker reads the controls without locks after taking that lock. The kill switch takes the `ORG` row first and the fixture rows second, so the lock order is acyclic.

### Audit trail

`audit_events` gains `actor_type` (`OPERATOR | SYSTEM | ANONYMOUS`), `fixture_id`, `reason`, `correlation_id`, `before` and `after`. It has keyset indexes on `(org_id, created_at desc, id desc)`, plus the same index prefixed by `fixture_id` and by `action`. A trigger rejects `UPDATE` and `DELETE` (spec §48: append-only audit). `GET /api/v1/audit-events` (`audit:read`) filters by action, actor type, target, fixture and time window. It pages newest first with an opaque `(created_at, id)` cursor, and a forged cursor answers `400 invalid-cursor`. Results come only from the caller's organisation.

### Permission seam

`RequirePermission('<scope>')` and `PermissionsGuard` deny by default: `401` without valid credentials, `403 forbidden` without the scope. Scopes are the `Permission` names in `libs/access`, which ADR-0018 defines. The guard resolves the caller through the `ACTOR_RESOLVER` port to an `Actor { type, id, orgId, permissions }`. Services receive the `Actor` and never see credentials. Today `OperatorKeyActorResolver` maps the shared key to the developer and producer permissions, the mapping ADR-0018 gives the operator key. When ADR-0018's API enforcement stage lands, the `libs/auth` authenticator and guard (same `RequirePermission` name and shape) replace this resolver and guard. Controllers and services stay as they are, the audit actor becomes the principal's user id, and the organisation comes from the principal.

## Alternatives considered

- **Queue producer commands to the worker** (as replay commands are queued). Rejected: the API could not confirm the retraction or write its audit row atomically, and sessions that are not loaded would never be retracted. A direct transaction under the shared fixture lock gives the same ordering guarantee.
- **Tell the in-memory scheduler about retractions.** Rejected: its decisions would then depend on wall-time producer input, which breaks determinism and restart rehydration. The retracted cue keeps its slot until its natural end, and the screen stays clear for that time.
- **Release held cues on resume.** Rejected: they are stale, and a producer who froze the air expects nothing old to reappear.
- **Free-text `overlay.retract.reason` only.** Rejected: clients need a machine-readable cause to tell a producer retraction from a natural end. `cause` is optional, so existing streams remain valid.

## Consequences

- New migration `0003_editorial_control_audit` (after `0002_session_retention`) adds `editorial_controls`, columns on `audit_events`, `insights` and `overlay_cues`, the indexes and the append-only trigger. It backfills `actor_type` (anonymous and `system:*` actors) and `fixture_id` for existing rows. Retention (ADR-0015) never deletes audit rows, so it is unaffected by the trigger. Like the earlier migrations it is forward-only, and a rollback is a restore.
- `StreamMessage` gains `editorial.status`, and `overlay.retract` gains an optional `cause`. The studio store records the latest editorial status. The UI controls come in a later PR.
- The shared key still grants every permission, so `403` is reachable only through the seam (a unit test covers it). Tenancy stays as described in ADR-0007.

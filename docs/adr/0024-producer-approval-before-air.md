# ADR-0024: Producer approve-before-air with a per-match publish policy

- Status: Accepted (2026-10-23). Implements MQ-062. Refines spec §29 (human in the loop), §31.4 (producer console: approval queue, copy fit, priority and duration editing) and §45 (`POST /insights/{id}/review`). Extends ADR-0016, whose editorial stage it reuses, and ADR-0018 (permissions, row-level security).

## Context

Until now every cue that passed the publish gate aired as `AUTO_APPROVED`. A producer could only act after air: retract, suppress, freeze or kill (ADR-0016). Spec §29 and §45 ask for a human in the loop, so that a producer can approve or reject a cue before it airs. Two constraints from ADR-0016 still apply. First, the overlay scheduler must stay a pure function of the event stream (ADR-0008), so that replays and restarts schedule cues the same way. Second, every producer command takes the fixture row lock that the worker's batch write takes.

## Decision

### Publish policy

- Each session has a publish policy: `AUTO` (the default, which keeps today's behaviour and the demo) or `MANUAL`. It is stored as an `APPROVAL` row in `editorial_controls`, keyed by the fixture, and is active when the policy is MANUAL. Migration `0009` widens the scope check. The table already has row-level security (ADR-0018).
- `POST /fixtures/{id}/editorial/publish-policy` takes `{ policy, reason }` and needs `policy:configure`. Tenant owners and producers have that permission; this ADR adds it to the producer role. The endpoint is idempotent in two ways: it honours `Idempotency-Key`, and setting the current policy again returns `changed: false`. It writes an `editorial.publish-policy.changed` audit row with the before and after values, and it announces the change in `editorial.status`.
- `EditorialStatus` gains `publishPolicy: { policy, changedAt }`. The field is optional in the contract, because `editorial.status` frames stored before this change do not have it. A missing field means AUTO.
- A freeze or the kill switch outranks MANUAL. While either one is active, new cues are `HELD` as before, not queued for approval.

### The scheduler is unchanged; MANUAL is an editorial-stage decision

The scheduler still decides when each cue gets the single on-air slot and when that slot ends. `applyEditorialPolicy` then applies MANUAL:

| Situation (MANUAL, mode AUTO)                                                         | Result                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The scheduler publishes a new cue                                                     | No `overlay.publish`. The row is stored as `VERIFIED` with `AWAITING_APPROVAL`, together with its copy and slot. The stream gets `overlay.review` (ids and state only), and the audit gets `overlay.awaiting-approval` |
| A new revision of a waiting cue                                                       | The stored row takes the newer copy and stays waiting. `overlay.review` announces the new revision                                                                                                                     |
| The scheduler ends the slot of a waiting cue (expiry, supersede, period or match end) | The cue lapses: its `overlay.retract` is replaced by `overlay.review` with `APPROVAL_EXPIRED`, the row becomes `EXPIRED`/`APPROVAL_EXPIRED`, and the audit gets `overlay.approval-expired`. It never airs late         |
| A new revision of an approved cue                                                     | Withheld (`APPROVED_COPY_LOCKED`). The approved copy is what airs                                                                                                                                                      |
| The end of an approved cue's slot                                                     | Passes through as a normal `overlay.retract`                                                                                                                                                                           |
| A new revision of a cue that aired before MANUAL was set                              | Withheld (`MANUAL_REVISION_WITHHELD`)                                                                                                                                                                                  |
| A rejected cue                                                                        | Every later revision and end is dropped, as for a retracted cue                                                                                                                                                        |

In AUTO with no producer action, the stream is byte-identical to the stream before this change, so the determinism and golden tests are unchanged.

### Review

- `POST /insights/{insightId}/review` takes `{ decision: APPROVE | REJECT, reason?, revision?, durationMs?, priority? }` and needs `editorial:approve`. It answers with the cue as it aired, or `null` for a rejection. It follows the ADR-0016 conventions: `Idempotency-Key`, `changed: false` when the cue is already in the requested state, RFC 9457 problems, and an audit row with before and after values (`overlay.approved` or `overlay.rejected`).
- **Approve** runs under the fixture lock. It checks that the cue is still waiting, that the reviewed `revision` is current (otherwise `409 overlay-revision-stale`), that graphics are neither frozen nor killed (otherwise `409 editorial-air-paused`), and that the session clock is still inside the cue's slot (otherwise `409 overlay-approval-expired`). It then publishes `overlay.publish` with status `APPROVED`. The cue starts at the current match clock and ends at `min(slot end, start + durationMs)`. `priority` replaces the cue's priority on the aired cue. Both overrides are bounded by the overlay contract limits, and they are accepted only with APPROVE.
- **Reject** sets the row to `RETRACTED`/`REJECTED` with the optional reason, publishes `overlay.review` `REJECTED`, and never airs the cue. Suppressing an insight whose cue is waiting also rejects the cue.
- `GET /fixtures/{id}/overlay-reviews` needs `editorial:approve`. It lists the waiting cues with their copy, `expiresAtClockMs` and `waitingSince`. The list is capped at 20. Because there is only one slot, at most one cue waits at a time.
- Retract, the kill switch and suppress treat a cue that is `LIVE` and `APPROVED` as on air.

### What "approve schedules through the scheduler" means here

An approval does not offer the cue to the scheduler again. Doing that would make the scheduler depend on wall-time producer input, which ADR-0016 rejected. Instead, the cue airs in the slot the scheduler already gave it. A late approval therefore airs for the rest of the slot and never past it. The two overrides have these limits:

- **Duration** can only shorten the time on screen. Clients hide a cue at its `clockEndMs`, and the formal `overlay.retract` still arrives at the end of the slot.
- **Priority** applies to the aired cue: clients rank cues on screen by it, and the cue log and audit record it. It does not reorder the scheduler's queue, which belongs to the deterministic scheduler.

### Security

`overlay.review` frames travel on the public stream, so they carry only the ids, the revision and the state, never copy. Unapproved copy can be read only through the permission-guarded queue endpoint. The read models exclude every cue that never aired (`AWAITING_APPROVAL`, `REJECTED`, `APPROVAL_EXPIRED`, `HELD`, `SUPPRESSED`).

## Alternatives considered

- **Hold cues at offer time, before the scheduler.** Rejected. The scheduler would need to know the policy, and it would schedule different slots than in AUTO. Restart rehydration would also need the approvals.
- **Queue the approval as a worker command.** Rejected for the same reason ADR-0016 gives for retractions: the API could not confirm the approval or audit it atomically.
- **Release a waiting cue when the policy goes back to AUTO.** Rejected. A cue that is already waiting keeps waiting until a producer reviews it or its slot closes. A policy change never puts anything on air by itself.

## Consequences

- Migration `0009_approval_publish_policy`, contract additions (`PublishPolicy`, `ReviewInsightCommand`, `ReviewInsightResult`, `OverlayReview(List)`, `SetPublishPolicyCommand`, the `overlay.review` stream message and the four new `OverlayEditorialState` values), the OpenAPI document and the producer role's `policy:configure`.
- The studio's broadcast panel gains the approval queue (preview, copy fit, time on screen and priority, "Send to air" and "Don't air"). The producer controls gain an Auto/Manual switch with a confirmation.
- Python codegen is unaffected: none of the cross-language contracts changed.

## Amendment (MQ-081): the approval window runs on the wall clock

A live walkthrough showed that the match-clock slot is unusable as an approval window: at 5x replay a 7 s cue lasts about 1.4 s of real time, and at 1x it lasts 7 to 10 s. All cues of a test session expired before a producer could act. This amendment replaces the slot-based lapse. The scheduler itself is unchanged, so AUTO output and the golden hashes are unchanged.

- A cue that enters `AWAITING_APPROVAL` gets a wall-clock deadline, `APPROVAL_WINDOW_SECONDS` after it first waits (worker env, default 45, range 5 to 600). It is stored in `overlay_cues.approval_deadline` (migration 0012). A new revision of a waiting cue keeps the first deadline.
- A scheduler end for a waiting or approved cue (expired, superseded, period ended) is no longer turned into a lapse. The policy drops it, so the cue stays waiting. A ruled-out moment (correction) or the final whistle still lapses a waiting cue at once.
- Each worker batch sweeps under the fixture lock: waiting cues whose deadline has passed lapse exactly as before (`APPROVAL_EXPIRED`, `overlay.review` frame, audit `overlay.approval-expired`, never aired late), and approved cues whose own match-clock slot is over get a normal `overlay.retract`.
- Approve checks the wall-clock deadline instead of the session clock (otherwise `409 overlay-approval-expired`). The cue then airs from the current match clock for its normal duration (or the producer's override, capped by the cue's `maxDisplayMs`). The stored period moves to the session's period.
- More than one cue can now wait at once, because the scheduler frees its slot while a cue waits. The list stays capped at 20 and is ordered oldest first.
- `GET /fixtures/{id}/overlay-reviews` adds `approvalDeadline` to each item and `serverTime` to the list. Lapsed cues are left out. The studio shows "Send within N s" from these, using the server clock offset so a wrong device clock does not matter.
- Limits: a lapse is written by the next worker batch, so a cue in a paused session shows as unavailable (the list hides it and approve answers 409) before its row changes. Rows stored before this change have no deadline and lapse at the next batch.

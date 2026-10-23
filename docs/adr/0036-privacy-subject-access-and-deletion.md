# ADR-0036: Privacy workflows for subject access and deletion are deferred

- Status: Accepted as a deferral (2026-10-23). Spec §48. Recorded by MQ-067. Numbers 0030 to 0036 were chosen to avoid collisions with ADRs that parallel work may add.

## Context

Spec §48 asks for a subject access and deletion workflow, stated purposes and retention, separation of telemetry from identity and counsel review of GDPR, UK GDPR and NDPR applicability. Since migration `0007_audit_actor_display_name`, audit rows for signed-in users hold a user id, roles and a display name, so MatchIQ now stores personal data (see `docs/operations/DATA_RETENTION.md`).

## Decision

Subject access and deletion workflows are deferred until after the hackathon. Audit rows are append-only (ADR-0016), kept indefinitely and not pruned. No export or erasure tool exists, and no privacy notice, DPA or counsel review has been done.

## Consequences

- A data subject request can be answered only by an operator querying `audit_events` directly. Erasure conflicts with the append-only trigger and needs a deliberate design (pseudonymise the actor rather than delete the row).
- MatchIQ makes no GDPR, UK GDPR or NDPR compliance claim.
- The public demo is anonymous and collects no identity; the exposure is limited to signed-in users, who are synthetic demo accounts in this build.

## What it would take

- A subject lookup and export keyed by user id across `audit_events` and any preference store.
- A pseudonymisation path for `actor` and `actor_display_name` that the append-only trigger allows, recorded as its own audit event.
- A privacy notice, purposes and retention schedule per data class, and log redaction review.
- Counsel review of applicable regimes by market, then a DPA pack.

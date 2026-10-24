# ADR-0033: Data-provider adapter, licence and provenance chain and clock-drift model are deferred

- Status: Accepted as a deferral (2026-10-23). Spec §42, §44, I4, I7. Recorded by MQ-067. Numbers 0030 to 0036 were chosen to avoid collisions with ADRs that parallel work may add.

## Context

Spec §42 requires a provider adapter contract (authenticate, map, preserve raw source hash and licence reference, deduplicate), a provenance chain (`providerId`, `licenseId`, `mappingVersion`, checksum, `syntheticFlag`) and reconciliation of gaps and feed disconnects. §44 requires a clock model with drift detection and a resync notice. Invariants I4 (provenance travels with data) and I7 (clock alignment) depend on them.

## Decision

A provider adapter framework, licence and rights records, the full provenance chain and a clock-drift model are deferred until after the hackathon. Today all data is synthetic. Events carry a minimal `Provenance` (synthetic flag and generator seed) and the synthetic label is always visible. Replay uses the match clock and the ledger sequence; there is no drift detection between an event clock and a display clock.

## Consequences

- MatchIQ cannot ingest a licensed feed and must not be described as ready for one. Hackathon synthetic data confers no Premier League or broadcaster rights.
- Provenance does not carry a licence reference, so rights scope cannot propagate to insights, recaps or exports (I4 is met only for the synthetic flag).
- Late or out-of-order events are handled by sequence and idempotency in the ledger, not by a bounded-watermark buffer, and a gap does not mark state provisional (I7 is partial).
- The clock-drift target of 250 ms is a spec objective, not a measurement.

> **Correction (MQ-082, 2026-10-24).** The statement above that a gap does not mark state provisional is wrong for the current code. `libs/football-engine/src/lib/projection/snapshot.ts` sets `provisional: hasSequenceGap(state) || hasPendingCorrection(state)`, with tests in the worker's `corrections.spec.ts` and `projection.spec.ts`, and the web scoreboard strip shows a badge. What is still missing is the bounded-watermark buffer, the stale indicator and the resync notice, so I7 remains partial.

## What it would take

- A `ProviderAdapter` port with capabilities `{events, tracking, video, ballSpeed, playerIdentity, corrections}` and a first adapter behind it.
- `provider_contracts` with rights JSON and validity, and a checksum and licence id on every event.
- Propagation of licence scope and `syntheticFlag` to insights, recaps and exports, with tests.
- Event-time and processing-time clocks, a watermark buffer, a provisional-state flag on gaps, a stale indicator and a resync notice.
- A provider qualification run (latency, completeness, correction rate) before any claim.

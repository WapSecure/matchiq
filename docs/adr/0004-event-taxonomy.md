# ADR-0004: Canonical event taxonomy v1

- Status: Accepted (2026-10-21). Resolves the conflict between spec §8 and §25.

## Decision

Use the §25 names as the base set and add `FINAL_THIRD_ENTRY`, `RECOVERY` and `CORRECTION` from §8. Possession uses a single `POSSESSION_CHANGED` event (`teamId: null` for contested time) instead of paired GAINED/LOST events, so there is one authoritative transition per change. Corrections are append-only `VOID`s; an amendment is a void plus a new event. `PASS_COMPLETED`/`PASS_INTERCEPTED` reference their `attemptEventId`. Coordinates are normalised 0–100 in the acting team's attacking direction.

## Consequences

22 discriminated event types in `libs/contracts/src/lib/events.ts`, with strict objects and no unknown fields. Any change requires `schemaVersion` handling.

# ADR-0038: Shot conversion, pass quality and player milestones

- Status: Accepted (2026-10-24). Spec §9, §25 (E04), §43. Delivers three rows of ADR-0029. Recorded by MQ-086.

## Context

The audit found shot conversion, pass quality and `PLAYER_MILESTONE` insights missing. The spec defines shot conversion but never defines pass quality. Pass events carry an origin and a target location, so a conservative definition is possible without tracking data.

## Decision

- **Shot conversion %** = (goals - own goals credited to the team) / shots * 100. Own goals are excluded because they are not from the team's shots and could push the ratio above 100. It is unavailable (`ZERO_DENOMINATOR`) with no shots.
- **Pass quality %** = completed passes whose `targetLocation.x - location.x >= 10` (pitch scale 0-100) / completed passes * 100. It is a heuristic proxy for forward progress. It ignores pass difficulty, defenders beaten and what happens after the pass, and it is labelled heuristic. The 10-unit threshold is a calibration constant (`PROGRESSIVE_PASS_MIN_GAIN`). Pass distance, difficulty and receiver pressure stay descoped in ADR-0029 (no end-point of the actual delivery, no tracking data).
- **Milestones**: first shot on target, first goal (own goals ignored) and first yellow card per player, priority P2, evidence is the exact event, id anchored to that event so re-scans are idempotent. Priority P2 emits no overlay cue; overlay rules are unchanged.
- **Evidence envelope**: optional `sampleSize`, `limitations` and `confidenceType` (`measured` or `heuristic`), populated by the milestone rules only. Other rules leave them unset until each is reviewed.
- `ALGORITHM_VERSION` and `MOMENT_METHOD_VERSION` are 1.1.0; golden hashes were re-pinned once.

## Consequences

- ADR-0029 rows for shot conversion and `PLAYER_MILESTONE` are delivered; the pass row remains for pass distance and difficulty only.
- The web metric registry copy carries both new entries.

# ADR-0008: Replay determinism scope and AI output recording

- Status: Accepted (2026-10-21)

## Decision

Determinism is guaranteed for canonical events, metrics, snapshots (`stateHash`) and deterministic overlay decisions (selection, timing, priority, collisions). Model text is not deterministic, so each accepted AI output is recorded with the key `(fixtureId, insightId, persona, locale, promptVersion)`. Replays that require exact reproduction serve the recorded output; otherwise they regenerate it and record the new revision.

## Consequences

Golden replay tests compare state hashes and cue sequences, and allow narrative wording to vary only when recording is disabled.

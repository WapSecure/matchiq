# ADR-0040: Pass distance, synthetic pass difficulty, shot speed and xG baseline

- Status: Accepted (2026-10-25). Spec §9, §25 (line 639). Extends ADR-0038. Recorded by MQ-097.

## Context

The challenge brief lists pass distance, pass difficulty and shot speed. Spec §25 allows a pass difficulty only as an explicitly labelled synthetic score and shot speed only from a recorded attribute. For xG it says to omit it until a labelled, validated model exists (and "optional calibrated model ... not required for MVP"), while the P1 requirement says "xG baseline if shot geometry available". The two statements pull in opposite directions.

## Decision

- **Pass distance (m)**: Euclidean distance between a pass's start and aimed end, scaled by the fixture pitch (`lengthM`, `widthM`). Team average over completed passes. Unavailable (`ZERO_DENOMINATOR`) with none.
- **Synthetic pass difficulty (0-100)**: 40 x min(distance / 40 m, 1) + 20 x sideways share (|dy| / distance) + 20 if the passer is under pressure + 20 x clamp(forward metres / 30, 0, 1). Team average over completed passes. Named "synthetic pass difficulty" everywhere and flagged heuristic. Never calibrated to real play.
- **Shot speed**: only `SHOT.speedKph`. Team average and maximum over shots that carry it; unavailable (`NOT_GENERATED`) otherwise. Nothing is inferred.
- **xG baseline**: resolves the tension by shipping an uncalibrated geometric baseline, not a model. For each shot, xG = 1 / (1 + exp(-(-0.2 - 0.12 x d + a))) where d is metres to the goal centre and a is the angle (radians) the 7.32 m goal mouth subtends from the shot. Constants are illustrative, hand-set for a plausible shape, not fitted to any data. Team value is the sum over shots; unavailable when the team has no shots (shot location is a required field, so a shot without location cannot exist; a missing location would make the metric unavailable).
- **Label and limits**: always "xG baseline (synthetic, not calibrated)". It ignores defenders, body part, assist and shot type, has no training data, dataset card or reliability check, and is not an expected-goals claim about real football. It appears only in metric definitions and evidence (Analyst view), never as a headline stat or team comparison row. Agents must not cite it as real-world accuracy.
- Snapshot fields are optional (`passDistanceAvgM`, `passDifficultyAvg`, `shotSpeedAvgKph`, `shotSpeedMaxKph`, `xgBaseline`), unit `xg` added. `ALGORITHM_VERSION` is 1.2.0; golden hashes re-pinned once.
- The team comparison shows pass distance, synthetic pass difficulty and shot speed only when both teams have a value.

## Consequences

- Spec §25 "omit xG" is deliberately narrowed: no calibrated xG is claimed; a labelled baseline is shown with limitations. A validated model remains future work.
- Still missing: ball speed beyond shot speed, player speed and distance (tracking data) and video auto-eventing.

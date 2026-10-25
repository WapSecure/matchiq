# ADR-0029: Metrics and personalisation that are descoped or not yet built

- Status: Accepted (2026-10-25). Proposed by MQ-082 and accepted by the product owner in MQ-091 (audit REM-09). Shot conversion %, a defined pass quality and `PLAYER_MILESTONE` rules were later built; see ADR-0038. Spec §9, §27, §32, §43, §47.

## Context

The audit found requirements that the product does not deliver. All reduce scope against the written spec. They are listed here so the submission and the product claim nothing more than exists. The deterministic engine computes counts from events only (ADR-0002; the player scope is in ADR-0023). Without tracking data the product does not invent positions, speeds or distances.

## Decision

The delivered ADR-0038 items are no longer part of this deferral. The remaining items below stay out of the hackathon scope.

| Item                                                                                     | Why not built                                                                                                                 | What it would take                                                                                                                          |
| ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Pass distance and pass difficulty                                                        | `targetLocation` is an intended destination, not a measured delivery end point, and there is no opponent or receiver tracking | A measured end point and tracking context, a calibrated formula, contract and generator changes, then registry and presentation entries     |
| Shot speed, ball speed, player speed and distance                                        | Some synthetic shots carry `speedKph`, but no metric consumes it; ball and player movement have no tracking feed              | A tracking feed or governed synthetic measurement, a provider capability flag (ADR-0033), metrics with units, and honest unavailable states |
| Audience dimensions: spoiler preference, alert frequency, metric interests, device class | Preferences hold persona, locale, favourite team and player focus only                                                        | Fields on the preferences contract, a migration, API and UI controls, and the scheduler and gate respecting them                            |
| Spec §47 analyst baseline and comparison windows                                         | Only the last 10 minutes against the match average, and the last three 5-minute spells, are computed                          | Baseline and comparison window definitions in the engine, citable metric refs, and a UI control                                             |

## Consequences

- The README and submission feature-gap lists must match this table.
- `NO_TRACKING_DATA` remains the truthful unavailable reason for player tracking views. Metre and kph units remain reserved contract values and do not imply that a speed or distance metric ships.
- A later ticket can deliver a deferred row, but it must define the evidence source, limitations and tests and then amend this ADR.

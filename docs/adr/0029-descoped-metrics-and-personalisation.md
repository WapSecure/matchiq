# ADR-0029: Metrics and personalisation that are descoped or not yet built

- Status: Proposed, owner to confirm (2026-10-24). Shot conversion %, a defined pass quality and `PLAYER_MILESTONE` rules were later built; see ADR-0038. Spec §9, §27, §32, §43, §47. Recorded by MQ-082 (audit REM-09).

## Context

The audit found requirements that the product does not deliver. All reduce scope against the written spec. They are listed here so the submission and the product claim nothing more than exists. The deterministic engine computes counts from events only (ADR-0002; the player scope is in ADR-0023). Without tracking data the product does not invent positions, speeds or distances.

## Decision

Each item stays out of scope until the owner says otherwise.

| Item                                                                                     | Why not built                                                                                                                          | What it would take                                                                                                                          |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Shot conversion %                                                                        | Not in the metric registry                                                                                                             | A registry entry (goals over shots, null when no shots), tests for the null denominator, a copy line in four locales                        |
| Pass distance, pass difficulty and pass quality                                          | The events carry no pass end point, and the spec never defines "quality"                                                               | A defined formula, a pass end coordinate on the pass event (contract change, generator change, codegen), then a registry entry              |
| Shot speed, ball speed, player speed and distance                                        | Needs tracking data; `SHOT.speedKph` is generated but no metric uses it, and `NO_TRACKING_DATA` and the metre and kph units are unused | A tracking feed or generator output, a provider capability flag (ADR-0033), metrics with units, and honest empty states where it is missing |
| `PLAYER_MILESTONE` insights                                                              | The type and its four-locale copy exist, but no moment rule emits it. Player Focus counts milestones in the UI instead                 | A moment rule per milestone, the gate and template for each, and tests                                                                      |
| Audience dimensions: spoiler preference, alert frequency, metric interests, device class | Preferences hold persona, locale, favourite team and player focus only                                                                 | Fields on the preferences contract, a migration, API and UI controls, and the scheduler and gate respecting them                            |
| Spec §47 analyst baseline and comparison windows (delivered by MQ-089)                   | Only the last 10 minutes against the match average, and the last three 5-minute spells, are computed                                   | Baseline and comparison window definitions in the engine, citable metric refs, and a UI control                                             |

## Consequences

- The README and submission feature-gap lists must match this table.
- The contract surface for `PLAYER_MILESTONE`, `NO_TRACKING_DATA` and the speed units is dead code that implies a feature. Either remove it or build the emitter. That choice is open.

## Update (MQ-089, 2026-10-25)

The Analyst baseline and comparison windows item is delivered in the web app from data the API already returns (`insight.context`, `evidence.sampleSize`, `evidence.limitations`). The Analyst evidence drawer has a "Compared with" block with a 5 minute, 10 minute and whole-match picker (default 10 minutes, remembered per device), sample sizes and a three-spell trend with a table view. Limits kept: the 5 minute view covers only the moment's team because the engine stores spell counts for that team alone, and whole-match totals are estimated from the stored match average. No new backend numbers were added.

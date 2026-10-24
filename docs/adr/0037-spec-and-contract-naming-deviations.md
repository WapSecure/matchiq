# ADR-0037: Naming deviations from the spec are accepted; the contracts are the source of truth

- Status: Accepted (2026-10-24, records a fact). Spec §11, §26, §29, §44, §45. Builds on ADR-0005 and ADR-0017. Recorded by MQ-082 (audit REM-09).

## Context

The spec names the same things differently in different sections (§11, §26, §29, §44, §45). ADR-0005 chose the resource names. The Zod contracts in `libs/contracts` and the OpenAPI document generated from them are the source of truth (ADR-0017).

## Decision

The product keeps these names. A client or reviewer should read the contracts and `docs/api/openapi.json`, not the spec's examples.

| Topic             | Spec                                                                                                   | Product                                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| Resource name     | `matches` (§29)                                                                                        | `fixtures` (ADR-0005)                                                                                    |
| State read        | `/snapshot` (§45)                                                                                      | `/state`                                                                                                 |
| Preferences path  | `/api/v1/preferences` (§29), `/v1/me/preferences` (§45)                                                | `/api/v1/me/preferences`                                                                                 |
| Review route      | `/producer/overlays/{id}/approve` (§29)                                                                | `POST /insights/{id}/review` (§45)                                                                       |
| Overlay fields    | `startMatchClockMs`, `durationMs`, `audienceMode`, `matchId`, `confidence`, `expiresAtWallClock` (§26) | `clockStartMs`, `clockEndMs`, `maxDisplayMs`, `persona`, `fixtureId`; no confidence or wall-clock expiry |
| Stream envelope   | `messageId`, `sequence` (§11)                                                                          | `streamSequence`; no `messageId`                                                                         |
| SSE event names   | `insight.verified` (§45)                                                                               | `insight.detected` and the names in the contract                                                         |
| Event fields      | `eventTime`, `evidenceIds` (§44)                                                                       | `wallClockUtc`, `evidenceEventIds`                                                                       |
| `Idempotency-Key` | Required on replay (§29), on writes (§45)                                                              | Optional on every route that supports it; not read by `PUT /me/preferences`                              |

## Amendment (MQ-085)

- `Idempotency-Key` stays optional; ADR-0039 lists the 12 routes that read it.
- The evidence endpoint exists as `GET /insights/{insightId}/evidence` (the spec's `/matches/...` form is the ADR-0005 rename). The recap filter parameter is `lang`; the narratives list keeps `locale`.

## Consequences

- External integrators get a typed client generated from the OpenAPI document (ADR-0017), so the names are discoverable.
- Moving to the spec's names would be a breaking change and needs a new schema version and an ADR.

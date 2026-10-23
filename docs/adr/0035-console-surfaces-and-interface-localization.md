# ADR-0035: Operator console, Dataset lab, Org admin, Methodology pages, interface localization and half-time recap are deferred

- Status: Accepted as a deferral (2026-10-23). Spec §12, §31, §47. Recorded by MQ-067. Numbers 0030 to 0036 were chosen to avoid collisions with ADRs that parallel work may add.

## Context

Spec §12, §31 and §47 list screens beyond the producer studio: an Operator console (platform diagnostics), a Dataset lab, Org admin (members, policy, billing), Methodology pages, interface (UI chrome) localization and a half-time recap. The studio, fixture lobby, Agent Observatory, audit view, post-match recap and sign-in are built.

## Decision

The Operator console, Dataset lab, Org admin, Methodology pages, interface localization and a half-time recap are deferred until after the hackathon. Commentary and overlays are localised (en-GB, fr-FR, es-ES, pcm-NG, ADR-0014); the interface itself is English, and operator controls stay English. The recap is produced after the match only.

## Consequences

- `platform:diagnostics`, `platform:config`, `members:manage`, `policy:configure` and `billing:read` have no screen and no route, so the platform-operator and tenant-owner roles have nothing to do in the console beyond reading.
- Methodology is explained in the repository (`docs/ai/EVALUATION.md`, ADR-0002), not in the product.
- The language picker changes commentary only. This is stated on the audience bar.
- There is no mid-match recap for a half-time segment.

## What it would take

- Route and screen work for each surface, guarded by the matching permission, with loading, empty, error and permission states.
- An interface message catalogue, locale routing and a review by native speakers (the Pidgin glossary is still pending review).
- A half-time recap built from the same snapshot and evidence rules as the full-time recap.
- Dataset lab depends on the provider adapter (ADR-0033); Org admin depends on ADR-0032 and ADR-0030.

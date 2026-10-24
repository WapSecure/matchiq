# ADR-0039: Ingest semantic checks and the Idempotency-Key policy

- Status: Accepted (2026-10-24). Spec §8, §24, §29, §45. Builds on ADR-0006, ADR-0033 and ADR-0037. Recorded by MQ-085 (audit R-08-17, R-24-02, R-29-02).

## Context

The ingest endpoint validated only the Zod shape. The synthetic-data semantic validator ran on fixture files only. The spec also requires `Idempotency-Key` on replay-creating writes, while the code accepts it as optional everywhere (ADR-0037).

## Decision

- **Streamed batches.** New events (not duplicates) are checked against the stored ledger tail with pure functions in `libs/synthetic-data` (`checkBatchOrder`, `findSequenceGaps`). A clock that runs backwards within a period, an event after `MATCH_ENDED`, a falling period, or a period change not opened by an adjacent `PERIOD_STARTED` answers `422 event-order`, with one error per offending event naming its id. Nothing is written.
- **Gaps** are not rejected. They are accepted, listed in the response `warnings`, and keep the snapshot provisional (ADR-0033).
- **Duplicates** keep the existing behaviour: identical re-sends are counted, changed bodies are `409`.
- **Not applied to streams:** player-to-team mapping, substitution, card and reference checks. They need the whole fixture and its squads and stay on fixture files.
- **Idempotency-Key** stays optional. The 12 routes that read it are listed in `docs/api/README.md`; every other route ignores it. The header description in `docs/api/openapi.json` says it is optional.

## Consequences

- A producer feed cannot store an impossible clock or period order, and a late-arriving gap fill is not mistaken for a regression.
- Callers that need exactly-once writes must send the key themselves; the API does not enforce it. Making it required is a breaking change and needs a new ADR.

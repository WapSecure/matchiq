# ADR-0027: Six shipped scenarios instead of eight

- Status: Accepted (2026-10-24, records a fact). Spec §13, §32 (E02). Recorded by MQ-082 (audit REM-09).

## Context

Spec §32 E02 asks for eight scenarios. §13 lists five (A to E). The repository ships six golden fixtures in `fixtures/`: `comeback`, `possession-dominance`, `red-card-swing`, `high-press`, `low-event` and `disallowed-goal`. The last is labelled F in `fixtures/README.md`, because the spec has no F; it exists to exercise the correction path (a goal ruled out while its graphic is on air).

## Decision

The product ships six scenarios. The count of eight in §32 E02 is not met, and no work is planned to reach it before the submission. The spec's "balanced match" has no named scenario; the mix of the six covers the behaviours the engine and the publish gate need to show (momentum, dominance, a red card, pressure, sparse data, corrections).

## Consequences

- The fixture lobby offers six matches. Documents must say six, not eight.
- Two more scenarios would each need a generator profile in `libs/synthetic-data`, a pinned fixture with its `eventsHash`, golden tests in the engine and the generator, and a lobby entry. It is a small change per scenario.

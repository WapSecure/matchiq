# ADR-0002: Deterministic football engine is the source of truth

- Status: Accepted (2026-10-21). Ratifies spec ADR-002 and D04.

## Decision

All match statistics, evidence windows and key-moment rules are pure, versioned functions in `libs/football-engine`. LLMs only explain, edit and localise. Every published number must resolve to a `metricRef` and source `eventIds`.

## Consequences

- The product works with AI disabled (`AI_ENABLED=false` by default).
- Agents and the UI never re-derive statistics. Duplicating calculations is a review blocker.

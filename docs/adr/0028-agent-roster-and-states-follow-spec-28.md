# ADR-0028: The agent roster and states follow spec §28

- Status: Accepted (2026-10-24, records a fact). Spec §10, §28, §46. Recorded by MQ-082 (audit REM-09).

## Context

The spec names three rosters. §10 lists an Event Analyst, Tactical Interpreter, Editorial Producer, Localization agent and Quality Gate. §28 lists a Match Analyst, Narrative Writer, Fact Checker, Broadcast Producer and Localization agent. §46 mentions a tactical agent, a narrative agent, an independent verifier and a personalization agent. §10 also lists orchestrator states including `DEAD_LETTER` and `RETRYING`; §28 lists a different set.

## Decision

The code follows §28, which is later and overrides §10 (`libs/contracts/src/lib/agents.ts`; the insight states in `libs/contracts/src/lib/insight.ts`; the pipeline state machine in `apps/agents/src/matchiq_agents/pipeline/fsm.py`). The roster is Analyst, Writer, Fact Checker, Producer and Localization. There is no Tactical Interpreter: its job is part of the Analyst. There are no `DEAD_LETTER` or `RETRYING` states. A failed or rejected step falls back to a deterministic template and the insight ends in `FALLBACK` (or `EXPIRED`), and retries happen inside a step under the retry policy. The deterministic publish gate is the only path to a published state, and replaces the Quality Gate agent.

## Consequences

- Trace and observability views show the five §28 agents.
- A dead-letter store for runs that fail repeatedly is not built. Adding it would need a new terminal state, a table and an operator view.

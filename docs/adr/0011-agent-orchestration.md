# ADR-0011: Agent orchestration on Agent Framework workflows with a typed FSM

- Status: Accepted (2026-10-21). Refines spec §10, §28 and §46. Complements ADR-0012 (providers).

## Context

The spec asks for genuine multi-agent collaboration (Match Analyst → Narrative Writer → Fact Checker → Localization, Broadcast Producer), a state machine `DETECTED → ANALYZED → DRAFTED → VERIFIED` with REVISE and REJECT branches, and it warns that "a typed orchestrator with demonstrable agent collaboration is preferable to a fragile framework integration" (§10).

We checked the installed SDK (`agent-framework-core==1.22.0`) before deciding. The graph workflow API (`WorkflowBuilder`, `Executor`, `@handler`, `WorkflowContext.send_message` / `yield_output`, conditional `add_edge(..., condition=...)`) is exported without an experimental or release-candidate marker. Only the functional workflow API (`@workflow` / `FunctionalWorkflow`) is flagged `@experimental`. A prototype confirmed that typed messages (frozen dataclasses), conditional back-edges (a REVISE loop) and exception propagation behave as documented. One workflow instance cannot run concurrently.

## Decision

- Each roster stage is an Agent Framework `Executor` (`apps/agents/src/matchiq_agents/pipeline/executors.py`). The edges are wired in `pipeline/workflow.py`, which uses conditional edges for PASS / REVISE / REJECT and for writer failure. A fresh graph is built per request.
- Messages are one immutable, typed `PipelineState`. Every status change goes through `PipelineState.advance`, which enforces the service-side FSM in `pipeline/fsm.py`. SCHEDULED and PUBLISHED belong to the worker's deterministic gate.
- Model calls go through a `ModelPort`. Agent Framework `Agent` instances on `FoundryChatClient` or `OpenAIChatClient` (Ollama) implement it, and so does a deterministic `MockModel`. A `ModelRunner` around the port applies the per-call timeout derived from `deadlineMs`, at most two retries with exponential backoff, and a process-wide circuit breaker. Transport faults and timeouts trip the breaker. Output that parses but fails grounding is retried without tripping it.
- The Fact Checker is deterministic first: cited values, evidence ids, the entity allowlist, a forbidden-claim lexicon and length limits. An AI critique runs only after a deterministic PASS, and it can only add concerns. REVISE regenerates once. REJECT, or a second failure, falls back to verified templates, and to suppression if even the templates fail.
- The orchestrator wraps the workflow in a hard deadline plus grace period. Any exception or overrun yields a template-only `PipelineResult`. The service never returns an error for a model failure.

## Alternatives considered

- **Hand-written FSM only.** It is simpler, but it does not use the framework's orchestration, which the judging rewards. It would also duplicate routing that `WorkflowBuilder` already provides.
- **Agent Framework orchestrations (sequential, group chat, handoff) with `AgentExecutor`.** These pass chat transcripts between agents. Our hand-offs must be typed, immutable fact packets with deterministic gates between agents, so routing on free-form conversation would weaken grounding.
- **Functional workflows.** These are marked experimental in 1.22, so we rejected them for a deadline-bound release.

## Consequences

- The multi-agent design is visible in code and in traces: one `AgentRun` per stage and attempt, carrying the correlation id.
- The workflow API surface is pinned by `tests/test_providers.py::test_workflow_api_surface_is_available`. An SDK upgrade that breaks it fails CI.
- Building a graph per request costs a few milliseconds, which is negligible next to model latency.

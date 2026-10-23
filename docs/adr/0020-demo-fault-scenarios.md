# ADR-0020: Deterministic demo fault scenarios

- Status: Accepted (2026-10-22). Implements spec §28 ("trace one failure and recovery chain in the demo"), §31.8 and §33; closes audit item P0-7. Complements ADR-0011 (orchestration) and ADR-0002 (deterministic gate).

## Context

The demo must show at least one failure and recovery chain. Real failures (a slow local model, a Foundry outage) cannot be produced on demand, and a mock provider never fails, so before this change a judge saw only happy paths. Any way of forcing failures must never reach production, must be honest that the failure is simulated, and must be deterministic, so the same replay shows the same chain every time.

## Decision

**Per-session plan, chosen in the lobby.** `CreateReplaySession` (`libs/contracts`) accepts an optional `faultPlan`: a `FaultScenario`, optional `insightKinds`, and `everyNth` (default 1). The plan faults the 1st, (1 + everyNth)th, … insight of those kinds, counted in detection order, which is deterministic per template (ADR-0008). It is stored on `replay_sessions.fault_plan` (migration `0006_session_fault_plan`), shown on the session view, and recorded in the `session.created` audit row. The lobby shows an advanced "Demo scenario" select only when `NEXT_PUBLIC_DEMO_MODE=true` (every third insight is faulted).

We rejected an environment-wide default: it could not be chosen per demo, and it would fault every session on a shared stage environment.

**Never in production.** `DEMO_FAULTS_ENABLED` (default `false`) is read by the API, the worker and the agents service. Each refuses to start with it set when `APP_ENV=prod`, in the same way the mock provider is refused. With it off, the API answers `403 demo-faults-disabled` to a plan, the worker never sends a fault, and the agents service ignores `PipelineRequest.fault`.

**Plumbing.** The worker resolves the plan for each insight-pipeline job and sets `PipelineRequest.fault`. The agents service stays stateless: it receives the fault per request.

**Scenarios.**

| Scenario        | Where                                                                                                                 | What the Observatory shows                                                                                                                                                          |
| --------------- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `WRITER_REVISE` | Agents: `FaultInjectingModel` adds a citation of `fault.injected = 99` to the first Writer draft                      | Writer draft (corruption note) → Fact Checker REVISE with its real notes, captured from the revision request → constrained revision of that persona only → PASS, published by Agent |
| `MODEL_TIMEOUT` | Agents: every model call raises `TimeoutError` at once, which the runner treats as an expired per-call budget         | Analyst TIMED_OUT (with retries) → Analyst template FALLBACK → the isolated breaker opens and later calls are refused (FAILED, short-circuited) → templates on air                  |
| `GATE_REJECT`   | Worker: the agents result's first agent draft gets the same ungrounded citation before the deterministic publish gate | Gate rejection (`UNSUPPORTED_NUMBER`, `publication.gated` audit row) → that variant's template airs; the other agent drafts publish                                                 |

- The agents side is a `ModelPort` decorator plus a routing wrapper in a new module (`matchiq_agents/faults`). The only existing seams it touches are `wiring.build_service`, `app.py` and the API dependency type. It works with every provider, so CI and demos run instantly on `mock`. With `ollama` or `foundry`, the stages around the fault are real model calls.
- A faulted run gets a **fresh circuit breaker** whose threshold is one call's full set of attempts. A demo can therefore open a breaker visibly without degrading the process-wide breaker that other sessions use.
- **Labelling.** Every run of a faulted pipeline carries `AgentRun.faultInjected`, and the steps of the chain carry `AgentRun.faultNote`. The Observatory renders a "Simulated failure (demo)" badge and the ordered chain with the final source. Mock output stays labelled as mock. A simulated failure is never presented as a real outage, and mocked output is never presented as real inference.

## Consequences

- The `AgentRun` and `PipelineRequest` contracts gain optional fields, and the Python models are regenerated. Older consumers ignore the fields.
- A plan is fixed at session creation. A new demo scenario means a new session, which matches ADR-0013.
- Timeout latency is near zero, because the timeout is raised rather than waited for. The chain is legible, but latency figures for faulted runs are not representative.
- Real-fault drills (killing Ollama, cutting the network) remain a separate operational exercise.

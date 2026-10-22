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

## Addendum (2026-10-22): batched calls and a local-inference slow lane

Measured on an M1 Pro with Ollama 0.40.7 (`llama-server -np 1 -c 4096`), `qwen2.5:7b-instruct`.

**Where single-call latency goes.** Output tokens, not prompt size. The Match Analyst prompt is 453 tokens (844-character instructions, 955-character data block); prefill takes 0.05–0.2 s once the system prompt is cached (2.4 s cold). Generation runs at about 20 tokens/s. Strict `json_schema` output produced 220 tokens (11 s); JSON mode produced 105 tokens (5 s) but never the required shape, so it is not usable. Asking for minified JSON saved no tokens (222), and capping claims saved 20% of tokens but not wall time. Changing `num_ctx` reloads the model (4.5 s). Ollama's OpenAI-compatible `/v1/responses` honours `temperature` and `max_output_tokens`. It ignores `keep_alive` and `options`, whether sent through Agent Framework's `extra_body` or directly, so those are server settings (`OLLAMA_KEEP_ALIVE`, `OLLAMA_CONTEXT_LENGTH`). The earlier "33 s per Analyst call" came from calls queuing behind each other on the single slot.

**Call graph.**

|                        | Before                                                                                                                   | After                                                                                                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Graph                  | analyst → writer → AI critique → localization × 3 locales (`asyncio.gather`, serialised by Ollama's one slot) → producer | analyst → writer → (AI critique, cloud only) → localization × 1 (every locale and persona in one call) → producer                                                            |
| Model calls, clean run | 7                                                                                                                        | 4 on `ollama`, 5 on cloud (mock eval p50 7 → 5)                                                                                                                              |
| Revision               | the whole draft set is rewritten                                                                                         | only the failing personas are rewritten; the drafts that passed are kept                                                                                                     |
| Final failure          | every persona falls back to templates                                                                                    | only the failing persona falls back; a failing (locale, persona) item gets its template when it states the same numbers and names, else the en-GB text with `localeFallback` |

- The Narrative Writer already wrote every persona in one call. A missing or contract-invalid persona no longer fails the whole call: the Fact Checker flags it, a revision asks for it, and in the end its template replaces it.
- A forbidden claim still rejects its draft outright, without revision. Shared issues (analysis, AI critique) still apply to every persona.
- The AI critique defaults off for `ollama` (`AGENT_CRITIQUE_ENABLED` blank = provider default). The deterministic Fact Checker always runs.
- Number words from English and phonetic Pidgin are now checked in fr-FR and es-ES too. Per-item acceptance exposed the gap: before, one bad item failed its whole locale.
- Model prose gets a deterministic clean-up: allowlisted names get their canonical capitals back, and hashtags are deleted. Neither edit can add a claim, and the checks run afterwards.
- The Writer, Localization and Producer no longer receive the engine's `rationale` and `counterEvidence` prose. Small models copied its wording and numbers ("two shots"). The Analyst still reasons over it, and the Writer now receives the analysis limitations.
- Data blocks are trimmed. A real packet carries about 28 metrics and 38 names (the whole squad list). Every prompt now names only the teams and the subject player, and the stages after the Analyst see only the metrics already cited upstream. The checks still use the full allowlist and evidence.
- Spelled-out numbers are rejected even when they match a value ("faiv" for 5), as the evaluation oracle already required: digits only.

**Slow lane.** `LIMITS.maxAgentDeadlineMs` and `AGENT_TIMEOUT_MS` now allow up to 180 s. Local inference needs minutes per insight, while cloud providers keep their short `AGENT_TIMEOUT_MS` by configuration. Templates are on air immediately, and the worker already upgrades them when a late verified result lands. For `ollama`:

- One call may use 0.75 of the deadline (0.5 for cloud). Inference is serial, and the batched Localization call is the longest stage.
- Timeouts have their own breaker counter (`AGENT_CIRCUIT_TIMEOUT_THRESHOLD`, default 8 consecutive) and no longer count as transport failures. A slow model is busy, not down. One pipeline times out at most twice before its deadline is spent, so 8 means about four pipelines in a row without one answer. Connection failures still open the breaker at `AGENT_CIRCUIT_FAILURE_THRESHOLD`.
- Output that parses but fails its checks is not retried (`output_retries=0`; cloud keeps 2). On local hardware a retry costs a full generation (10–25 s), and at low temperature it mostly repeats the same output. Each stage already has a deterministic recovery: the template analysis, the persona revision, or the per-item template.
- The service now answers within `deadlineMs` itself. Model work stops `grace_ms` early (1 s for cloud, 5 s for local), and the hard stop is the deadline, no longer the deadline plus grace. On a loaded machine, cancelling an in-flight Ollama call took up to 3.5 s past the old hard stop. That pushed the answer beyond the worker's HTTP timeout (`AGENT_TIMEOUT_MS` + 1.5 s), which would have triggered a needless retry.
- Temperature is 0.2, and output caps are set per agent (Localization 2,400 tokens), because truncated JSON fails to parse.
- The recommended profile is `AGENT_TIMEOUT_MS=120000`, `AGENT_JOB_CONCURRENCY=1` and `qwen2.5:7b-instruct` (see `.env.example` and the implementation log for the evaluation).

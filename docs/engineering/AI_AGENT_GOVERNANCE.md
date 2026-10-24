# AI and Agent Governance

Covers both the product's runtime agents and the coding agents that build the repository.

## Runtime agents (apps/agents)

**Stack.** Microsoft Agent Framework (`agent-framework-core`) and `agent-framework-foundry`, using `Agent(client=FoundryChatClient(project_endpoint, model, credential))`. Settings use the framework's variable names, `FOUNDRY_PROJECT_ENDPOINT` and `FOUNDRY_MODEL`. Before using any SDK API, verify it against Microsoft Learn. `tests/test_foundry_sdk.py` guards the API surface we depend on.

**Roster (spec §28):** Match Analyst → Narrative Writer → Fact Checker → Localization → Broadcast Producer (the order the workflow runs them).

**Contracts.** Agents receive an immutable `FactPacket` (insight, evidence envelope and entity allowlist) and return `AgentResult` or `VerificationResult`. Both are typed by the generated Pydantic models.

**Non-negotiable rules**

1. Agents never compute authoritative statistics. Every number in a claim must appear in `citedValues` and match `evidence.computedMetrics` or the insight's engine context `context.metrics` (MQ-068).
2. Every claim cites at least one `evidenceEventId` from the envelope. Teams and players must come from the allowlist.
3. Agents return proposals. Only the worker's deterministic gate publishes.
4. Timeouts (`AGENT_TIMEOUT_MS`), at most 2 retries, and a circuit breaker apply. After that, fall back to a deterministic template, or suppress the output.
5. Event metadata is untrusted and is placed in prompts as delimited data. Adversarial strings are part of the evaluation set.
6. Each run records `AgentRun`: provider, model deployment, prompt version and content hash, latency, tokens, cost estimate, retries, deterministic repairs and outcome.
7. Replay determinism covers events, metrics, snapshots and deterministic overlay decisions. AI text is recorded per `(fixtureId, insightId, persona, locale, promptVersion)` and replayed from that record when exact replay is required (ADR-0008).

**Providers (ADR-0012).** `mock` (tests), `ollama` (real local inference through Agent Framework's OpenAI-compatible client) and `foundry` (target Azure integration). `AgentRun.provider` always records the real source. **Honesty:** mock or template output is never described as model output, and Ollama output is never described as Foundry. `/health/ready` reports `degraded` for `mock`, or when the configured model endpoint is unreachable.

**Local slow lane (ADR-0011 addendum).** `AGENT_TIMEOUT_MS` may be up to 180 s for local inference, and cloud providers keep short deadlines. On `ollama` the AI critique is off by default, timeouts have their own breaker threshold, and rejected output is not retried. Templates are always on air first. A late agent narrative replaces them only after the deterministic checks and the worker's gate pass.

**Prompt registry.** Prompts are versioned (SemVer) and hashed (SHA-256 of the instructions, user task and data framing). `apps/agents/src/matchiq_agents/roster/prompt_registry.json` records every (version, hash) pair and is append-only. CI fails when prompt text changes without a recorded version bump, or when the checked-in Ollama baseline was not recorded against the current prompts. Changing a prompt therefore requires a fresh offline evaluation (`docs/ai/EVALUATION.md`).

**Deterministic repairs (ADR-0011 addendum 2).** Model prose may be repaired before the checks only in ways that cannot add a claim: trailing sentences dropped to meet a persona's sentence or length limit, a time-window phrase whose number is an engine metric's window (and not a cited value) replaced by "recently", and an overlay's missing `metricRef` added when exactly one metric cited by its approved draft has that value. Every repair is recorded on the run's `AgentRun.repairs`. Numbers that are metric values are never changed, and no grounding rule is relaxed.

**Feedback retries.** A rejected Analyst or Producer answer gets one retry that feeds back each violation with its fix, only while at least 60% of the deadline is left. On `ollama` blind retries of rejected output stay off, and a timed-out call is not retried.

**Content safety.** A deterministic blocklist (profanity, slurs, and abuse aimed at players, teams or officials, in all four locales) runs inside every text check, so it covers drafts, translations, overlays and templates. A hit is a forbidden claim: the persona falls back to its template without revision.

**Independent publish gate (MQ-065, ADR-0022).** The worker gate does not trust the Fact Checker's verdict. Besides schema, numbers, entities, evidence and length, it re-runs, in pure TypeScript (`libs/narrative-guard`), the forbidden-claim lexicon (`FORBIDDEN_CLAIM`), injection echoes such as "ignore previous instructions", prompt leakage, links and markup (`INJECTION_ECHO`), causal connectives in a sentence that names no cited value and no recorded event (`UNSUPPORTED_CAUSALITY`), repeated phrases within one text and agent drafts near-identical to a narrative published for the same variant in the last 10 match minutes (`REPETITION`), and the blocklist, shouting in capitals and repeated exclamation marks (`UNSAFE_TONE`). The forbidden and safety patterns have one source, `libs/narrative-guard/src/lib/lexicon.ts`. `pnpm codegen` writes them to JSON, which the Python guard loads, and CI fails if the two drift. A failing draft is rejected, never repaired: its variant airs the standard template, and the reason code is recorded on the gate report and shown on the fact-checks page. `ContentSafetyScreen` is the port for a hosted classifier such as Azure AI Content Safety; none is wired until Azure exists (ADR-0003), and a configured screen fails closed.

**Handoff records and budget (ADR-0011 addendum 4).** Every stage transition is an `AgentStep` with its decision, reason, input checksum and cited evidence, stored per run and served by `GET /agents/traces/{correlationId}`. A central per-run budget (`AGENT_BUDGET_MAX_HOPS`, `AGENT_BUDGET_MAX_TOKENS`, `AGENT_BUDGET_MAX_COST_USD`) stops further model calls once reached and falls back with `BUDGET_EXCEEDED`.

**Analyst breakdown and match story (MQ-068, ADR-0011 addendum 5).** The engine adds a deterministic `MomentContext` to every key moment: the score state and margin, the scoreboard minute and phase, the last 10 minutes against the match average for the moment's key count, the trend over the last three 5-minute spells, the regain before a goal and the previous moment of the same kind. Every number has a fixed `context.*` metricRef and is cited like an envelope metric. Analyst narratives carry a three-part breakdown (what happened, why it matters, what to watch) written by deterministic templates in every locale, in the agents service and in the worker. Each part is checked like a body: cited values, every numeral cited, evidence ids from the envelope or the context, names, forbidden claims, causality and tone, one part per metric, and labelled indices only. A failing breakdown is dropped and the worker's own template takes its place, never the reverse. "What to watch" is a hedged pointer with no number and never a prediction. The full-time match story is built by the worker from the final snapshot and the moments' context; a paragraph with any number that does not match its source is left out. No model writes the breakdown or the story in this release; the Analyst may cite one context value in a claim.

**Cost.** `AgentRun.costEstimateUsd` comes from the `AGENT_PRICE_TABLE` setting (USD per million tokens per deployment). Local inference and the mock record 0; a cloud deployment without a price records no estimate.

**Evaluation (M2).** 38 golden insight cases plus 8 adversarial inputs and 13 scripted model attacks. Release gate: zero unsupported numeric claims, zero unknown entities, and fallback verified with the model disabled. Methodology, failure taxonomy and the recorded baselines: `docs/ai/EVALUATION.md`.
**Demo fault scenarios (ADR-0020).** A session can be created with a fault plan (`WRITER_REVISE`, `MODEL_TIMEOUT`, `GATE_REJECT`) to show a failure and recovery chain on demand. This needs `DEMO_FAULTS_ENABLED=true`, which every service refuses at startup in prod. Each faulted run carries `faultInjected` and is shown as "Simulated failure (demo)". A faulted run uses its own circuit breaker, so it never degrades real sessions. A simulated failure is never described as a real outage.

## Coding agents (Claude Code and others)

- Read `CLAUDE.md`, these engineering documents and the relevant spec sections before changing code.
- Work in an isolated git worktree on a branch owned by one workstream. Edit only the paths your workstream owns (see `.github/CODEOWNERS` and `AGENTS.md`).
- `libs/contracts`, database migrations, root configuration and CI belong to the platform lead. Propose changes to them through PRs.
- Never fabricate command output, test results, integrations, Azure access or deployments. Report failures verbatim.
- Do not add tool attribution to commits or PRs.
- After each task, hand off with: summary, changed files, commands run, test results, known limitations, and the next tickets.

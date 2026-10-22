# AI and Agent Governance

Covers both the product's runtime agents and the coding agents that build the repository.

## Runtime agents (apps/agents)

**Stack.** Microsoft Agent Framework (`agent-framework-core`) and `agent-framework-foundry`, using `Agent(client=FoundryChatClient(project_endpoint, model, credential))`. Settings use the framework's variable names, `FOUNDRY_PROJECT_ENDPOINT` and `FOUNDRY_MODEL`. Before using any SDK API, verify it against Microsoft Learn. `tests/test_foundry_sdk.py` guards the API surface we depend on.

**Roster (spec §28):** Match Analyst → Narrative Writer → Fact Checker → Broadcast Producer → Localization.

**Contracts.** Agents receive an immutable `FactPacket` (insight, evidence envelope and entity allowlist) and return `AgentResult` or `VerificationResult`. Both are typed by the generated Pydantic models.

**Non-negotiable rules**

1. Agents never compute authoritative statistics. Every number in a claim must appear in `citedValues` and match `evidence.computedMetrics`.
2. Every claim cites at least one `evidenceEventId` from the envelope. Teams and players must come from the allowlist.
3. Agents return proposals. Only the worker's deterministic gate publishes.
4. Timeouts (`AGENT_TIMEOUT_MS`), at most 2 retries, and a circuit breaker apply. After that, fall back to a deterministic template, or suppress the output.
5. Event metadata is untrusted and is placed in prompts as delimited data. Adversarial strings are part of the evaluation set.
6. Each run records `AgentRun`: provider, model deployment, prompt version, latency, tokens, retries and outcome.
7. Replay determinism covers events, metrics, snapshots and deterministic overlay decisions. AI text is recorded per `(fixtureId, insightId, persona, locale, promptVersion)` and replayed from that record when exact replay is required (ADR-0008).

**Providers (ADR-0012).** `mock` (tests), `ollama` (real local inference through Agent Framework's OpenAI-compatible client) and `foundry` (target Azure integration). `AgentRun.provider` always records the real source. **Honesty:** mock or template output is never described as model output, and Ollama output is never described as Foundry. `/health/ready` reports `degraded` for `mock`, or when the configured model endpoint is unreachable.

**Local slow lane (ADR-0011 addendum).** `AGENT_TIMEOUT_MS` may be up to 180 s for local inference, and cloud providers keep short deadlines. On `ollama` the AI critique is off by default, timeouts have their own breaker threshold, and rejected output is not retried. Templates are always on air first. A late agent narrative replaces them only after the deterministic checks and the worker's gate pass.

**Demo fault scenarios (ADR-0017).** A session can be created with a fault plan (`WRITER_REVISE`, `MODEL_TIMEOUT`, `GATE_REJECT`) to show a failure and recovery chain on demand. This needs `DEMO_FAULTS_ENABLED=true`, which every service refuses at startup in prod. Each faulted run carries `faultInjected` and is shown as "Simulated failure (demo)". A faulted run uses its own circuit breaker, so it never degrades real sessions. A simulated failure is never described as a real outage.

**Evaluation (M2).** 30 golden insight cases plus adversarial inputs. Release gate: zero unsupported numeric claims, zero unknown entities, and fallback verified with the model disabled.

## Coding agents (Claude Code and others)

- Read `CLAUDE.md`, these engineering documents and the relevant spec sections before changing code.
- Work in an isolated git worktree on a branch owned by one workstream. Edit only the paths your workstream owns (see `.github/CODEOWNERS` and `AGENTS.md`).
- `libs/contracts`, database migrations, root configuration and CI belong to the platform lead. Propose changes to them through PRs.
- Never fabricate command output, test results, integrations, Azure access or deployments. Report failures verbatim.
- Do not add tool attribution to commits or PRs.
- After each task, hand off with: summary, changed files, commands run, test results, known limitations, and the next tickets.

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

**Honesty.** The `mock` provider exists for development, deterministic tests and documented fallback only. Never describe mock output as a Foundry integration. `/health/ready` reports `degraded` while the provider is mock.

**Evaluation (M2).** 30 golden insight cases plus adversarial inputs. Release gate: zero unsupported numeric claims, zero unknown entities, and fallback verified with the model disabled.

## Coding agents (Claude Code and others)

- Read `CLAUDE.md`, these engineering documents and the relevant spec sections before changing code.
- Work in an isolated git worktree on a branch owned by one workstream. Edit only the paths your workstream owns (see `.github/CODEOWNERS` and `AGENTS.md`).
- `libs/contracts`, database migrations, root configuration and CI belong to the platform lead. Propose changes to them through PRs.
- Never fabricate command output, test results, integrations, Azure access or deployments. Report failures verbatim.
- Do not add tool attribution to commits or PRs.
- After each task, hand off with: summary, changed files, commands run, test results, known limitations, and the next tickets.

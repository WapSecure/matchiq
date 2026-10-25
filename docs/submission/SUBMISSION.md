# MatchIQ: submission write-up

Microsoft × Premier League: Inside the Game developer hackathon. Prepared 2026-10-23 and refreshed 2026-10-25 against `dev`; CI green at `44eda85`.

Claims in this document carry the evidence labels from spec §58:

- **[VALIDATED]**: measured or tested, with the artefact linked.
- **[DESIGN]**: built and tested in code, but not exercised in the environment named.
- **[TARGET]**: an objective that has not been measured.
- **[ASSUMPTION]**: needs confirmation.

## Elevator pitch

MatchIQ turns a stream of synthetic football events into broadcast-ready, evidence-grounded match intelligence. A deterministic football engine computes every statistic and detects the moments that matter. A team of specialised agents built on Microsoft Agent Framework explains each moment for three audiences in four languages and proposes a timed overlay. A deterministic publish gate checks every number, name and citation before anything airs. Producers can freeze, retract, suppress or kill output at any time, and every action is audited. One trusted event stream feeds many audience experiences, and nothing on screen is a number the model made up.

**Microsoft technology used:** Microsoft Agent Framework (in use, with real local inference). Microsoft Foundry (integrated in code, never exercised). Entra ID (configuration-ready, never exercised). Azure Container Apps, PostgreSQL Flexible Server, Managed Redis, Key Vault and Monitor through Bicep (linted, never deployed). Details are in [Use of Microsoft technology](#use-of-microsoft-technology).

## The problem

Live football coverage needs context fast: why a spell of pressure matters, what changed in the last ten minutes, what a casual fan in Lagos needs compared with an analyst in London. Today that context is assembled by hand under time pressure, so it is usually thin, slow or available in one language only.

Generative AI looks like the answer, but in broadcast it brings a specific risk. A model that invents a statistic or a player name on air is a reputational and sometimes a contractual problem. Broadcasters need AI that is fast, explainable, auditable and under editorial control, and that degrades safely when the model is slow or unavailable.

## The solution

MatchIQ follows the challenge's five-stage pipeline (official rules §4.1):

| Stage           | What MatchIQ does                                                                                                                                                                                                                                                                                        | Where                                                                                                                                         |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Ingest**      | Append-only event ledger with idempotent batch ingest, a transactional outbox and a resumable SSE stream. A seeded generator produces realistic fixtures in five scenarios, with 22 event types defined and at least 19 exercised in the fixtures (PLAYER_POSITION and BALL_POSITION are never emitted). | `apps/api`, `libs/db`, `libs/synthetic-data`, [ADR-0004](../adr/0004-event-taxonomy.md), [ADR-0006](../adr/0006-persistence-and-messaging.md) |
| **Interpret**   | A pure engine projects events into match state: possession (time-weighted), pass completion, shots, pressure, recoveries, final-third entries, rolling windows and a momentum index. Every snapshot has a state hash.                                                                                    | `libs/football-engine`, [ADR-0002](../adr/0002-deterministic-engine-first.md)                                                                 |
| **Explain**     | Key-moment rules (goal, red card, shot burst, high regains, pressure swing, momentum shift) emit evidence envelopes. Agents explain them, citing `metricRef` and `eventIds` only.                                                                                                                        | `libs/football-engine/src/lib/moments`, `apps/agents`                                                                                         |
| **Render**      | Timed overlay cues (create, update, retract) with priority, dwell time and collision handling, shown in a 16:9 broadcast preview. Templates air at once, and verified agent copy replaces them.                                                                                                          | `apps/worker`, `apps/web`, [ADR-0013](../adr/0013-replay-sessions-and-intelligence-pipeline.md)                                               |
| **Personalize** | Casual, Analyst and Broadcast personas in English, French, Spanish and Nigerian Pidgin. The numbers are the same in all 12 variants, and the content changes by audience.                                                                                                                                | [ADR-0014](../adr/0014-nigerian-pidgin-locale.md)                                                                                             |

Around the pipeline: a match recap at full time, an Agent Observatory that shows every agent run, and producer editorial controls with an audit trail.

## How it works

1. **Replay session.** A judge starts a fixture from the lobby. The API creates a session and the worker feeds the template's events into that session's ledger at the chosen speed (1×, 5×, 20× or 30×).
2. **Deterministic projection.** Each event updates the match state through pure functions. Replays are reproducible: the same events give the same state hashes and the same overlay decisions ([ADR-0008](../adr/0008-replay-determinism-scope.md)).
3. **Key moment and evidence.** When a rule fires, the insight carries its computed metrics, source event ids, a rationale and counter-evidence.
4. **Template first.** A deterministic template narrative and cue go on air immediately. The product is complete with AI switched off.
5. **Agents propose.** The worker sends a `FactPacket` to the stateless agents service. Agent Framework executors run Match Analyst → Narrative Writer → Fact Checker → Localization → Broadcast Producer as a typed state machine (`DETECTED → ANALYZED → DRAFTED → VERIFIED`) with REVISE and REJECT branches, bounded retries, deadlines and a circuit breaker ([ADR-0011](../adr/0011-agent-orchestration.md)).
6. **The gate decides.** The worker's publish gate re-checks every cited value, numeral, evidence id, entity name, persona length and requested variant. Only drafts that pass are published. Anything else keeps the template.
7. **Editorial policy.** Freeze, kill switch, suppress and retract apply after the scheduler. Every decision writes an audit row with actor, reason, correlation id and before/after state ([ADR-0016](../adr/0016-editorial-control-and-audit.md)).
8. **Delivery.** Clients receive everything through the outbox and SSE, with `Last-Event-ID` resume and snapshot resync on gaps.

## What is novel

- **The model never owns a number.** Statistics come only from the engine. Agents cite metric references and event ids, and two independent deterministic checks verify them: the agents' Fact Checker, then the worker's publish gate. The evaluation oracle shares no code with the Fact Checker, so a test cannot pass just because the checker agrees with itself ([`EVALUATION.md`](../ai/EVALUATION.md)).
- **Safe by construction, not by prompt.** Event text reaches the model as escaped data blocks. Adversarial names and forged delimiters are in the evaluation set, along with 13 scripted compromised-model attacks that run in CI.
- **Template first, agent second.** A broadcast cannot wait for a slow model. Verified templates are always on air first, and agent copy replaces them only after verification. A slow or failed model lowers quality but never takes the product down.
- **Failure you can watch.** Demo fault scenarios (`WRITER_REVISE`, `MODEL_TIMEOUT`, `GATE_REJECT`) force a labelled, deterministic failure and recovery chain on demand. The Observatory shows it as "Simulated failure (demo)", and every service refuses to enable this in production ([ADR-0020](../adr/0020-demo-fault-scenarios.md)).
- **Editorial control as a first-class contract.** Freeze, retract, suppress and an organisation kill switch are API operations with permissions, idempotency keys and audit rows. They are not UI toggles.
- **Prompt governance.** Every prompt is versioned and hashed in an append-only registry. CI fails if prompt text changes without a version bump and a fresh recorded live baseline with zero violations.
- **Nigerian Pidgin (pcm-NG).** A football audience that major products rarely serve, with its own templates, number-word checks and glossary.

## Use of Microsoft technology

| Technology                    | How it is used                                                                                                                                                                                                                                                                                             | Status                                                                                                                                                                         |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Microsoft Agent Framework** | `agent-framework-core` 1.22.0 graph workflows (`WorkflowBuilder`, `Executor`, conditional edges) orchestrate the five-agent roster. `agent-framework-openai` 1.17.0 connects to Ollama.                                                                                                                    | **[VALIDATED]** Used in every live run, including session `fx_comeback_42_s7` and the recorded Ollama baseline.                                                                |
| **Microsoft Foundry**         | `agent-framework-foundry` 1.15.0 `FoundryChatClient` with managed identity (`ManagedIdentityCredential` in Azure, `AzureCliCredential` locally) and no API keys. `scripts/foundry_probe.py` is ready. The Bicep can create a Foundry account, project and model deployment.                                | **[DESIGN] Implemented, never exercised.** There is no Azure subscription ([ADR-0012](../adr/0012-local-first-ai-providers.md)). Contract tests use a fake client only.        |
| **Microsoft Entra ID**        | The API is a provider-neutral OIDC resource server, and the claim mapping covers Entra token shapes. Switching from Keycloak is configuration only ([guide](../security/IDENTITY_AND_ACCESS.md#switching-to-microsoft-entra-id)).                                                                          | **[DESIGN] Configuration-ready, never exercised.** Verified against local Keycloak only.                                                                                       |
| **Azure (Bicep)**             | Container Apps (4 apps and a migrate job), Container Registry, PostgreSQL 17 Flexible Server, Azure Managed Redis, Key Vault, Log Analytics, Application Insights, user-assigned identity with least-privilege roles, Foundry, a budget. An OIDC GitHub Actions deploy workflow with what-if and approval. | **[DESIGN] Linted, never deployed.** `az bicep build` and `lint` pass in CI. `what-if` and deployment have never run ([`infra/azure/README.md`](../../infra/azure/README.md)). |
| **Azure Monitor**             | An OpenTelemetry collector variant with the `azuremonitor` exporter.                                                                                                                                                                                                                                       | **[DESIGN] Seam only, not exercised.**                                                                                                                                         |
| **Azure AI Content Safety**   | A `ContentSafetyScreen` port that fails closed when configured. A deterministic blocklist runs today.                                                                                                                                                                                                      | **[DESIGN] Port only, not wired.**                                                                                                                                             |
| **GitHub**                    | Public repository, GitHub Actions CI with CodeQL, dependency review and the promotion path.                                                                                                                                                                                                                | **[VALIDATED]** CI green on `dev` ([run 40105654686](https://github.com/WapSecure/matchiq/actions/runs/40105654686)).                                                          |

Recorded model run (not a Microsoft service): `MODEL_PROVIDER=recorded` replays real output from the local model so a judge without a model or GPU still sees agent-written cards, the Observatory and the fact check. It is a replay of earlier output, labelled "Recorded model run" everywhere, and it runs through the same Agent Framework roster checks and publish gate. It is not a live model and says nothing about Foundry or Azure ([ADR-0042](../adr/0042-recorded-model-provider.md)).

We do not claim Azure MCP, Fabric, GitHub Copilot SDK integration or any hosted Azure service.

## Measured results

All live numbers come from the owner's MacBook (M1 Pro) running Ollama. The earlier sessions used `qwen2.5:7b-instruct`; the 25 October matches used `qwen2.5:3b-instruct` because the laptop was out of memory. They are synthetic-fixture measurements on one laptop and are not a statement of real-world or cloud performance.

| Measure                                           | Result                                                                                                                                                                                                                                                                                                                                                               | Source                                                                                                                                                                                                                                                               |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Live session `fx_comeback_42_s7` (5×)             | 19 insights, all published with agent-sourced narratives. 228 narratives: 222 agent-written, 6 template. **0 publish-gate rejections.** The Analyst fell back to its template on 9 of 19 insights. 117 of the 171 non-English narratives were served in English (`localeFallback`): this is the defect [PR #40](https://github.com/WapSecure/matchiq/pull/40) fixed. | **[VALIDATED, local]** Read on 2026-10-23 from the owner's running stack: `GET /api/v1/fixtures/fx_comeback_42_s7/narratives` and `/agent-runs`. This session was recorded before PR #40 merged. Others cannot reproduce it without running a session themselves.    |
| Localization after PR #40 (10 cases)              | Fully localised share of agent-sourced non-English narratives: **28% (11/39, historical, before commit `4d977d6`, no committed artifact) → 87% (48/55, committed baseline)**. 0 grounding violations in both runs. Overall agent share 88% (68/77). Latency p50 64.7 s, p95 110.1 s per insight.                                                                     | **[VALIDATED]** [`apps/agents/tests/eval/baselines/ollama-qwen2.5-7b-instruct.json`](../../apps/agents/tests/eval/baselines/ollama-qwen2.5-7b-instruct.json), [PR #40](https://github.com/WapSecure/matchiq/pull/40), [implementation log](../implementation-log.md) |
| Behaviour under heavy load                        | At load averages of 12–47 most calls timed out and templates stayed on air: 13.5% agent share with 0 violations.                                                                                                                                                                                                                                                     | **[VALIDATED]** Implementation log, MQ-026 and MQ-009 entries                                                                                                                                                                                                        |
| Four matches on a laptop short of memory (25 Oct) | `qwen2.5:3b-instruct`, Late comeback at 5×, one agents call at a time: 14, 6, 0 and 0 of 41 moments model-written (s14 to s17). In the last two the writer timed out at its call limit (about 101 s) every time, and the compact-prompt setting did not change that. The fact check stopped 12 and 16 drafts and nothing wrong aired.                                | **[VALIDATED, local]** `docs/ai/EVALUATION.md`, "Throughput at demo speeds"                                                                                                                                                                                          |
| Mock evaluation (CI)                              | 46 cases (38 golden, 8 adversarial) and 13 scripted model attacks. 0 unsupported numbers, 0 unknown entities, 0 leaks.                                                                                                                                                                                                                                               | **[VALIDATED]** `apps/agents/tests/eval/`, runs in every CI build                                                                                                                                                                                                    |
| Replay throughput                                 | 1,470 events at maximum speed in 2.5 s (≈ 580 events/s) on a shared, loaded machine. ≈ 900 events/s earlier, unloaded.                                                                                                                                                                                                                                               | **[VALIDATED, local]** `pnpm perf:replay`, implementation log, MQ-025 and M2/M3 entries                                                                                                                                                                              |
| Accessibility                                     | axe WCAG 2.x A and AA rules fail the build at moderate impact and above (raised 25 Oct); green on `dev`, desktop and mobile, light and dark. The manual keyboard and screen-reader pass has not been done ([checklist](../design/ACCESSIBILITY_CHECKLIST.md)).                                                                                                       | **[VALIDATED]** `apps/web-e2e`, CI e2e job                                                                                                                                                                                                                           |

**Graceful degradation is the design.** On a laptop under heavy load, local inference is slow, calls hit their deadlines and the templates stay on air. Nothing unverified is published, and the Observatory shows each fallback with its reason. Faster inference, such as a cloud deployment, should raise the agent share. That is a **[TARGET]**, not a measured result, because Foundry has never been exercised.

**Decision for the demo video (25 October).** On the development laptop the local model could not finish write-ups inside a 5× replay, so the live take is recorded with standard wording and the agent evidence comes from sessions recorded earlier with real local inference ([DEMO_SCRIPT.md](DEMO_SCRIPT.md)). Player-milestone moments always publish standard wording at detection so the single writer serves goals and swings first (ADR-0011, addenda 6 and 7).

## Impact

- **Broadcasters and streamers.** Verified, timed graphics and commentary notes within the editorial workflow, with a kill switch and an audit trail that compliance teams can review.
- **Analysts.** Every claim links to its source events and metric definitions, so an insight can be checked instead of trusted.
- **Fans in more markets.** The same facts in English, French, Spanish and Nigerian Pidgin, written for a casual fan, an analyst or a broadcast lower third.
- **Developers.** An OpenAPI 3.1 contract generated from the shared Zod schemas, a typed client and an SSE stream with resume semantics.

Commercial value is a hypothesis. We have not run customer interviews or pilots, and we make no ROI claim (spec §39 and §55 describe the validation plan).

## Production readiness: what exists and what does not

Exists and is tested: OIDC with six roles and deny-by-default permissions, tenant isolation in the API and in Postgres row-level security (with a cross-tenant integration suite), editorial control and audit, session capacity limits, idempotent commands, data retention, structured logs, traces and metrics, strict CSP and security headers, container images with SBOMs and vulnerability scans, CodeQL, secret scanning and dependency audits.

Does not exist yet:

- A hosted deployment.
- Any Azure or Foundry execution.
- An end-to-end run of the observability stack (validated statically only).
- Load tests beyond the replay smoke.
- SCIM or organisation self-service.
- DAST, image signing, a privacy notice and a DPA.
- Native-speaker review of the French, Spanish and Pidgin copy.

## Limitations

- **Not deployed.** The owner decided not to host before the verdict. The local setup is the test build ([checklist](CHECKLIST.md)).
- **Foundry, Entra ID and Azure are unverified.** The code paths exist; none has run against a real service.
- **The recorded run is a replay.** It exists for machines without a model. It covers only the Late comeback scenario, was written by the local 7B model on 23 October 2026, and today's checks reject some of that wording (9 of its 19 moments fall back to standard wording on a fresh session). Other scenarios show standard wording.
- **Local AI is slow.** p50 is about 65 s per insight on an M1 Pro, so agent copy arrives after the template. On a laptop short of memory it did not arrive at all in two measured matches (0 of 41 moments). A clean figure needs a quiet machine with room for the 7B model; that run has not been done.
- **Feature gaps against the challenge brief (rules §4.1 ii).** Pass distance, a synthetic pass difficulty score, shot speed (only from `SHOT.speedKph`), an uncalibrated xG baseline, a pass-quality share, shot conversion and player milestones are now published by the engine ([ADR-0040](../adr/0040-pass-distance-difficulty-shot-speed-xg-baseline.md)); the difficulty score and the xG baseline are synthetic and not calibrated to real play. Still missing: ball speed beyond shot speed, player speed and distance (these need tracking data) and video auto-eventing. Player Focus counts from match events only: without tracking data it shows no speed or distance ([ADR-0023](../adr/0023-player-focus-scope.md)).
- **Single worker replica.** Replay sessions are owned by one worker ([ADR-0013](../adr/0013-replay-sessions-and-intelligence-pipeline.md)).
- **Simulated faults are instant.** Their latency is not representative ([ADR-0020](../adr/0020-demo-fault-scenarios.md)).
- **Listen uses the viewer's device voice.** Quality and available languages depend on the device and browser. Nigerian Pidgin has no voice, so audio is offered only if the device has a Nigerian English voice ([ADR-0041](../adr/0041-audio-narration-via-the-device-voice.md)).
- **Pidgin glossary** is pending native-speaker review ([`PIDGIN_GLOSSARY.md`](../localization/PIDGIN_GLOSSARY.md)).

## Roadmap

1. **Hosting (deferred until after the verdict).** A public demo on the single-VPS path (compose and Caddy, `infra/vps`), with an uptime check.
2. **Azure.** With a subscription: `what-if`, deploy the Bicep, run `foundry_probe.py`, record a Foundry evaluation baseline, then switch Entra ID on by configuration.
3. **Challenge features.** Pass difficulty and distance, shot speed from the event data, and player speed and distance in Player Focus once fixtures carry tracking data.
4. **Enterprise.** SCIM, a per-tenant publication policy, Azure AI Content Safety, DAST, signed images, a privacy and DPA pack, and load tests with SLO burn-in.
5. **Data.** A licensed-provider adapter framework with rights and provenance propagation (spec §42). Synthetic data stays the default for demos.

## Team

- Solo entry: Orji Joseph Onyedika (GitHub `WapSecure`), product owner and engineer.

## Category

Best Multi-Agent System. Five agents (Match Analyst, Narrative Writer, Fact Checker, Localization, Broadcast Producer) collaborate in an Agent Framework graph workflow with revise, reject and fallback branches, and a deterministic gate decides what airs.

## Deck and licence

The pitch deck is a 12-slide Slides deck built on 25 October, exported by the owner as .pptx and PDF (outline: [PITCH_DECK.md](PITCH_DECK.md)). The licence is MIT. The on-air preview keeps its "Simulated match" watermark.

## AI-use and data disclosure

- **Data.** Synthetic only, generated by `libs/synthetic-data` with seeds recorded in each fixture's manifest. Fictional clubs and players. No Premier League data, footage, logos, kits or music. The UI labels the data as synthetic.
- **AI in the product.** Narratives and overlay copy may be generated by `qwen2.5:7b-instruct` running locally through Ollama, or by Microsoft Foundry when configured (unverified). Every published draft has passed deterministic checks, and each narrative records whether an agent or a template produced it. Models never compute statistics.
- **AI in development.** The code was written with AI coding assistants under [`AI_AGENT_GOVERNANCE.md`](../engineering/AI_AGENT_GOVERNANCE.md#coding-agents-claude-code-and-others). The owner reviewed and merged every change through pull requests with CI.
- **Third-party components.** See [`NOTICE`](../../NOTICE).

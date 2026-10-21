# MATCHIQ
## Microsoft × Premier League — Inside the Game Developer Hackathon
### Enterprise Product Requirements, Solution Architecture, Engineering Backlog & Submission Playbook

**Version:** 3.0 | **Prepared:** October 20, 2026 | **Status:** Detailed design baseline; requires implementation and validation | **Competition deadline:** October 27, 2026, 11:59 PM Pacific

> **Important:** MatchIQ is a proposed solution. The specification differentiates official hackathon rules from engineering recommendations. Microsoft/Premier League endorsement, access to official football data, Azure quotas and prize eligibility are not assumed.

## Contents
1. [Executive mandate and product vision](#executive-mandate-and-product-vision)
2. [Official competition constraints and verification register](#official-competition-constraints-and-verification-register)
3. [Differentiation and judging strategy](#differentiation-and-judging-strategy)
4. [Scope, assumptions and prioritization](#scope-assumptions-and-prioritization)
5. [Personas, jobs-to-be-done and user journeys](#personas-jobs-to-be-done-and-user-journeys)
6. [Epics, user stories and acceptance criteria](#epics-user-stories-and-acceptance-criteria)
7. [System architecture and component boundaries](#system-architecture-and-component-boundaries)
8. [Event schemas, data model and storage](#event-schemas-data-model-and-storage)
9. [Football metrics, rules and explainability](#football-metrics-rules-and-explainability)
10. [Agent architecture and orchestration contract](#agent-architecture-and-orchestration-contract)
11. [API and real-time contracts](#api-and-real-time-contracts)
12. [UX, screen inventory and design system](#ux-screen-inventory-and-design-system)
13. [Synthetic match generator and replay implementation](#synthetic-match-generator-and-replay-implementation)
14. [Infrastructure, deployment and observability](#infrastructure-deployment-and-observability)
15. [Testing, evaluation and quality gates](#testing-evaluation-and-quality-gates)
16. [Seven-day implementation plan and ownership](#seven-day-implementation-plan-and-ownership)
17. [Backlog, dependencies and definition of done](#backlog-dependencies-and-definition-of-done)
18. [Coding-agent implementation operating procedure](#coding-agent-implementation-operating-procedure)
19. [Submission assets, pitch and video storyboard](#submission-assets-pitch-and-video-storyboard)
20. [Risk register and mitigations](#risk-register-and-mitigations)
21. [Roadmap beyond the competition](#roadmap-beyond-the-competition)
22. [References, decisions and assumptions ledger](#references-decisions-and-assumptions-ledger)


## 1. Executive mandate and product vision

MatchIQ is a newly developed, event-driven football intelligence platform for the Microsoft + Premier League Inside the Game Developer Hackathon. It ingests synthetic football-realistic events, builds deterministic match state, identifies explainable tactical moments, orchestrates specialized AI agents, and publishes audience-specific, multilingual stories and broadcast overlays.

Product promise: one trustworthy event stream, many differentiated experiences. Every AI claim should trace to evidence, every overlay should be timestamped, and every personalized output should preserve the same underlying facts.

Primary personas: broadcast producer (timed graphics and editorial controls); football analyst (metrics, evidence, tactical interpretation); casual supporter (clear accessible storytelling); global fan (preferred language, team/player preferences); platform operator (monitoring and governance).

North-star demo: a replayed 90-minute synthetic fixture compressed into 90 seconds, showing a momentum swing, explainable tactical insight, two audience modes, two languages, overlay generation, and a final match recap. Avoid presenting simulated data as a real Premier League match.

Product status: implementation blueprint, not a claim of an existing working system. All targets, estimates, and architecture choices below are proposed engineering decisions.

## 2. Official competition constraints and verification register

Authoritative source: https://aka.ms/insidethegame/rules (Microsoft official rules, accessed October 20, 2026). Registration closes October 20 at 12:00 PM Pacific; user has confirmed registration. Hackathon submission closes October 27 at 11:59 PM Pacific. The official rules say winners announced by November 20, while the event overview says top six notified by November 10; distinguish notification from public announcement.

Teams may include up to four individuals. Project must be newly created after the registration period begins. Source repository must be public. Submission needs a concise project pitch, a functioning accessible demo, and a publicly accessible video strictly shorter than two minutes, on an accepted video platform. English submission materials or English translations are required. Provide evaluation access without charge or restrictions through judging. Synthetic football-realistic data is mandatory; no official footage or match data is supplied by organizers. Any footage, logos, third-party assets or APIs require valid permissions. Do not imply Premier League licensing or official endorsement.

Five judging dimensions, 20% each: technological implementation; agentic design and innovation; real-world impact and applicability; UX and presentation; adherence to category. Categories: grand prize first/second; best Microsoft Foundry; best enterprise solution; best multi-agent system; best Azure cloud-native integration. Prize allocations are not simply $50,000 cash for a single entrant; inspect section 8 for precise per-person prize conditions.

Compliance gates: [ ] registration and Innovation Studio invitation confirmed; [ ] public repo and licensing audit; [ ] demo accessible anonymously or test credentials supplied; [ ] sub-2-minute video; [ ] submission fields complete; [ ] synthetic provenance stated; [ ] permissions documented; [ ] no copyrighted broadcast footage or unlicensed team branding; [ ] English documentation; [ ] demo and repository remain online through judging; [ ] submitted before deadline.

Open questions to verify in Innovation Studio: exact project form fields; Microsoft cloud account quota and Foundry model availability; accepted video hosting visibility; deployment region and credits; dataset format from organizers if any; prize and tax eligibility in participant jurisdiction. Do not assume answers.

## 3. Differentiation and judging strategy

Positioning: MatchIQ is a live football editorial intelligence engine rather than a static stats dashboard. Differentiators: evidence-linked claims; synchronized broadcast overlays; purpose-built agents; deterministic football computations; persona- and language-specific output; resilient event replay; reproducible synthetic fixtures.

Recommended primary category: Best Multi-Agent System. Secondary alignment: Best Use of Microsoft Foundry and Best Azure Cloud Native Integration; organizer may reassign categories. Do not overengineer five categories at the expense of a coherent demo.

Proof for technological implementation: event contracts, streaming ingest, materialized state, CI, tests, reproducible fixtures, Foundry integration, telemetry. Proof for agentic design: specialized agents with explicit handoffs, shared state, bounded retries and independent evaluation. Proof for real-world impact: broadcast producer workflow, timing constraints, moderation, cost model and extensible APIs. Proof for UX: polished 16:9 broadcast studio, analyst dashboard and casual-fan mode. Proof for category: visible multi-agent execution trace and failure recovery.

Competition-specific success is not a guaranteed prize. Optimize for observable functioning behavior and auditable evidence, not exaggerated claims.

## 4. Scope, assumptions and prioritization

P0 MUST SHIP: synthetic event generator and fixture replay; match state; pass/shot/possession statistics; pressure/momentum heuristic; key-moment detector; evidence-backed explanation; 3 specialized agents minimum; live dashboard; synchronized overlay feed; fan vs analyst personalization; English + one additional language; final recap; deployable public demo; public repo; 110-second video.

P1 IF TIME: player-focused mode; automated editorial approval queue; multilingual audio narration; xG baseline if shot geometry available; producer cue controls; replay timeline; AI evaluation dashboard; event correction handling; mobile-responsive view.

P2 POST-HACKATHON: video object tracking, computer vision auto-eventing, licensed match feed ingestion, rights-cleared footage, richer player physical tracking, Fabric lakehouse, large-scale fan segmentation, paid enterprise tenancy, complex predictive modeling.

Explicit exclusions: licensed Premier League live feeds; actual broadcast footage; betting or gambling advice; player biometric tracking; proprietary official league datasets; real-time performance guarantees without load tests. Synthetic data may resemble football but should not misrepresent real player events.

Engineering assumptions: one live fixture and 100–1,000 simulated events for judging; event replay at accelerated speed; model outputs may require fallback templates; Azure service provisioning is not guaranteed. Keep local development runnable without paid cloud services.

## 5. Personas, jobs-to-be-done and user journeys

BROADCAST PRODUCER: select fixture -> watch validated moments -> preview suggested on-screen overlay -> approve/suppress cue -> see broadcast-safe payload -> export recap. Acceptance: overlay is timecoded, legible, attributable to evidence and removable instantly.

ANALYST: open match -> inspect possession/pressure trends -> click key moment -> see supporting events, confidence and rule/model basis -> compare preceding time windows -> export explanation. Acceptance: every metric displays definition and data coverage.

CASUAL FAN: select favorite team -> choose plain-language mode -> receive brief match narratives and notable moments -> switch language -> read concise recap. Acceptance: no unexplained technical jargon, no unsupported claims.

PLAYER-FOCUSED FAN: select synthetic player -> follow touches, passes, shots, contributions and key moments. Acceptance: only metrics supported by the generated event schema are shown.

OPERATOR: inspect pipeline health, replay controls, agent execution traces, errors and audit records. Acceptance: deterministic replay works with AI disabled and secrets are never exposed in the browser.

## 6. Epics, user stories and acceptance criteria

EPIC E01 Fixture and synthetic-data management
US-001 As operator I can create a seeded synthetic fixture with teams, players and formations. AC: schema-valid fixture; deterministic seed; reproducible replay; synthetic watermark.
US-002 As operator I can generate ordered passes, shots, fouls, recoveries and possession changes. AC: event ids unique; timestamps monotonic within replay ordering; valid team/player references; football-plausibility checks.
US-003 As operator I can replay at 1x/5x/20x and pause/resume. AC: resume without duplicate event application; current game clock visible; state reproducible.

EPIC E02 Real-time football intelligence
US-004 As analyst I see score, shots, completed passes, possession and pressure. AC: metrics derived deterministically from accepted events; definitions documented; state updates after each event.
US-005 As analyst I can inspect key moments. AC: each moment includes triggering event ids, evidence window, severity, timestamp and reason.
US-006 As analyst I see changes in control and momentum. AC: formula documented; no claim of scientific validity beyond heuristic; comparable windows used.
US-007 As producer I receive overlay cues. AC: stable cue ids, match clock, priority, expiration, payload and cancellation event.

EPIC E03 AI agent orchestration
US-008 As operator I see an event-intelligence agent summarize facts. AC: output conforms to JSON schema; no invented stats; evidence references present.
US-009 As operator I see a tactical agent interpret the evidence. AC: uncertainty represented; causal language constrained; factual claims validated.
US-010 As producer I see editorial agent produce two versions. AC: analyst and fan variants share the same facts; readability and length budgets enforced.
US-011 As operator I can retry failed model calls. AC: timeout, backoff, circuit breaker and deterministic template fallback; no duplicate publication.

EPIC E04 Experience and localization
US-012 As viewer I can switch analyst/casual mode without resetting the match. AC: stable event stream, different explanations, persisted selection.
US-013 As viewer I can select English and French. AC: meaning preserved, player/team names stable, fallback English if translation fails.
US-014 As viewer I can follow a team/player. AC: relevant insights prioritized; global score and important match events remain visible.
US-015 As viewer I can access keyboard-operable controls. AC: labeled buttons, focus indicators, WCAG-aware contrast and reduced-motion option.

EPIC E05 Governance and submission
US-016 As judge I can launch a working public demo without payment. AC: clear instructions and seeded fixture; uptime monitored.
US-017 As judge I can inspect public repository and architecture. AC: README, setup, tests, license, attribution, sample env and reproducible commands.
US-018 As judge I can watch a sub-120-second demo. AC: public URL, real application footage, no unlicensed audio/assets, script covers value and tech.

## 7. System architecture and component boundaries

RECOMMENDED MONOREPO
apps/web: Next.js 16, TypeScript, Tailwind CSS v4, TanStack Query, Zustand for ephemeral playback UI, accessible charting and broadcast preview.
apps/api: NestJS HTTP and WebSocket/SSE gateway, authless demo read APIs with protected operator endpoints, rate limiting, OpenAPI.
apps/worker: Node.js/TypeScript BullMQ workers for ingestion, state aggregation, key moments and AI jobs.
packages/contracts: Zod schemas, TypeScript types, event versioning, shared enums.
packages/football-engine: pure functions for match state, metrics, evidence windows, tactical heuristics.
packages/agent-runtime: orchestrator, agent interfaces, structured output validation, Foundry adapter, fallback models.
packages/synthetic-data: fixture seeds, generator, validator and replay scripts.
packages/ui: shared design primitives and accessibility patterns.
infra: Bicep or Terraform; GitHub Actions; container definitions; dashboards.

DATA FLOW
Synthetic fixture generator -> event ingest endpoint -> schema validator -> idempotent event store -> queue -> football engine -> match-state snapshot -> key-moment detector -> agent orchestration -> editorial safety validator -> overlay publisher -> SSE/WebSocket -> Next.js views.

Recommended MVP infrastructure: Azure Container Apps (web/API/worker), Azure Database for PostgreSQL (events/state/publications), Azure Cache for Redis (BullMQ/cache), Azure AI Foundry model deployment (structured explanations), Azure Monitor/Application Insights (telemetry), Azure Key Vault (secrets), Azure Blob Storage (fixtures and exports). Optional Fabric pipeline is an extension only if access and time permit.

Local parity: Docker Compose with PostgreSQL and Redis; mock model adapter and deterministic fixtures. The app must remain demoable if Foundry quotas are exhausted.

## 8. Event schemas, data model and storage

CANONICAL EVENT CONTRACT (version 1)
{
  "eventId":"evt_00042", "schemaVersion":1, "fixtureId":"fixture_001", "sequence":42,
  "period":1, "matchClockMs":1850000, "wallClockUtc":"2026-10-20T12:00:00Z",
  "type":"PASS_COMPLETED", "teamId":"team_blue", "playerId":"p_09",
  "location":{"x":62.4,"y":40.1}, "targetLocation":{"x":77.2,"y":33.4},
  "attributes":{"distanceM":18.3,"underPressure":true},
  "provenance":{"source":"synthetic-generator","seed":42}
}

Required entities: Fixture(id, teams, status, start, dataSource); Team(id, name, syntheticFlag); Player(id, teamId, position, syntheticFlag); MatchEvent(eventId, fixtureId, sequence, clock, type, actor, payload, provenance); MatchSnapshot(fixtureId, lastSequence, metricsJson, version); Insight(id, fixtureId, eventIds, evidence, severity, confidence, status); AgentRun(id, correlationId, agentName, model, tokenUsage, latency, status); Narrative(id, insightId, persona, language, body, citations, moderationStatus); OverlayCue(id, fixtureId, startClockMs, endClockMs, priority, payload, status); AuditLog(id, actor, action, time, details).

PostgreSQL constraints: UNIQUE(fixture_id, sequence), UNIQUE(event_id), FK references, JSONB event payload with schema version, indexed fixture+clock; snapshots transactionally associated with applied sequence. Store only validated events. Consider outbox table for reliable publish after transaction.

Event types: MATCH_START, MATCH_END, PERIOD_START, PERIOD_END, PASS_ATTEMPTED, PASS_COMPLETED, PASS_FAILED, SHOT, GOAL, SAVE, TACKLE, INTERCEPTION, RECOVERY, POSSESSION_CHANGE, FOUL, YELLOW_CARD, RED_CARD, SUBSTITUTION, PRESSURE, CORRECTION. Not all events require every field; enforce discriminated unions.

Synthetic-data constraints: monotonic match clock per period; nonnegative durations; consistent player-team mapping; scores only increase from accepted goal events; no shot speed unless explicitly generated; no tracking distance without tracking samples; plausibility of possession transitions; preserve generator version, seed and fixture metadata. Maintain a data dictionary and fixture manifest.

## 9. Football metrics, rules and explainability

Metrics must be computed in deterministic functions before any LLM call.
Pass completion % = completed passes / attempted passes * 100, with null if denominator zero. Shot conversion % = goals / shots * 100. Possession %: prefer synthetic possession-duration segments / elapsed ball-in-play time; if only event counts exist, label as estimated event-based possession rather than actual possession time. Pressure count: validated pressure events per team/window. Attack intensity: weighted recent shots, final-third entries, recoveries and pressure; disclose weights and normalize by window length.

Suggested 5-minute momentum heuristic: M = 0.35*z(shots) + 0.25*z(finalThirdEntries) + 0.20*z(pressures) + 0.20*z(highRecoveries); compute per team with bounded reference scale. This is a product heuristic, not validated match outcome prediction. Show confidence based on event completeness and sample count, not fabricated statistical probability.

Key-moment rules: goal always priority P0; red card P0; shot burst threshold P1; repeated high regains P1; sustained territory/pressure swing P1; player milestone P2. Debounce related events and group by window. Narrative example: 'Blue generated three shots and five high recoveries in the previous five minutes; this suggests growing territorial pressure.' Avoid unsupported 'the manager changed tactics' or 'player was exhausted'.

Evidence envelope: insightId, fixtureId, windowStartMs, windowEndMs, eventIds[], computedMetrics{}, methodVersion, dataCoverage, confidenceLabel, rationale, counterEvidence[], generatedAt. The narrative validator checks every number and team/player reference against this envelope; if unsupported, reject and use a template. User can open an evidence drawer showing the triggering events.

Pass difficulty can be an explicitly labeled synthetic score derived from pass distance, angle, pressure and progression; do not claim real-world calibrated difficulty. Expected goals (xG) must be omitted until an appropriately labeled model with shot geometry and validation exists.

## 10. Agent architecture and orchestration contract

AGENT A — Event Analyst: consumes snapshots and evidence windows, extracts factual change candidates. Output: fact list with source event ids and metric paths. No creative text.
AGENT B — Tactical Interpreter: consumes verified facts, produces cautiously worded interpretations, counterevidence and confidence label. Must distinguish observation from inference.
AGENT C — Editorial Producer: selects narrative importance, output format, audience profile, broadcast-safe length and overlay timing. Does not modify source metrics.
AGENT D — Localization Specialist: optional, translates approved copy into target languages and checks named entities, numerals and football terms.
AGENT E — Quality Gate: deterministic validation plus optional AI critique, checks provenance, consistency, forbidden claims, repetition, format and tone.

Orchestrator finite state machine: EVENT_ACCEPTED -> SNAPSHOT_READY -> MOMENT_DETECTED -> FACTS_READY -> INTERPRETATION_READY -> DRAFT_READY -> VALIDATED -> PUBLISHED; branches REJECTED, RETRYING, FALLBACK_PUBLISHED, DEAD_LETTER. Correlation ID propagates through all stages. Shared state is typed and immutable per stage; idempotency key fixtureId+momentId+persona+language+revision. Human editorial override can suppress any cue.

Foundry: use deployed model through a server-side adapter; record model/deployment/version, request id, latency and token usage. Use JSON-schema structured output where supported. Set tight max tokens, temperature, timeout and retry policy. Use a local deterministic mock provider for CI and outages. Consider Microsoft Agent Framework only if verified stable and accessible; a typed orchestrator with demonstrable agent collaboration is preferable to a fragile framework integration.

Example structured output:
{"insightId":"ins_12","claim":"Blue have intensified pressure","evidenceEventIds":["evt_40","evt_41"],"observations":["5 recoveries in 5 minutes"],"inferences":["territorial pressure may be increasing"],"confidence":"medium","limitations":["synthetic event feed"]}

Guardrails: prompt-injection isolation (event metadata is data, not instructions), JSON schema validation, number checking, controlled terminology, strict source grounding, content moderation, no secrets in prompts, output caching and replay safety. Agents must never independently publish without quality gate approval.

## 11. API and real-time contracts

REST (versioned /api/v1): GET /fixtures; POST /fixtures/synthetic (operator); GET /fixtures/:id; POST /fixtures/:id/replay/start; POST /fixtures/:id/replay/pause; POST /fixtures/:id/replay/seek; GET /fixtures/:id/events?cursor=; GET /fixtures/:id/state; GET /fixtures/:id/insights; GET /insights/:id/evidence; GET /fixtures/:id/recap?persona=&lang=; GET /fixtures/:id/overlays; GET /health/live; GET /health/ready.

SSE /api/v1/fixtures/:id/stream: event names match.event, match.snapshot, insight.detected, narrative.ready, overlay.publish, overlay.retract, replay.status, heartbeat. Envelope: {messageId,fixtureId,sequence,emittedAt,type,payload,schemaVersion}. Clients reconnect using Last-Event-ID and fetch snapshot before applying incremental messages. For broadcast cue consumers, a stable cue id and retract semantics are mandatory.

API errors: RFC 7807-style problem details; 400 invalid input, 401/403 protected controls, 404 unknown fixture, 409 replay state conflict, 422 invalid event, 429 rate limit, 503 model dependency degraded. Generate OpenAPI docs and TypeScript clients from shared schemas.

Operational concerns: request id, auth for mutating endpoints, rate limits, payload limits, CORS allowlist, server-only model credentials, structured logs with PII redaction, strict validation and bounded queue growth.

## 12. UX, screen inventory and design system

Visual identity: MatchIQ; dark broadcast-grade canvas, restrained electric-cyan highlight, white text, high-contrast chart accents; clear 'SYNTHETIC MATCH DEMO' watermark. Avoid using official Premier League marks without rights. Responsive desktop-first layout, mobile spectator mode.

SCREEN 01 Landing: product promise, watch demo, architecture summary, synthetic disclosure.
SCREEN 02 Fixture Lobby: cards, fixture status, choose synthetic fixture, start replay.
SCREEN 03 Live Studio: top scoreboard/time; center pitch/event timeline; right AI insights; bottom live metrics; broadcast overlay preview; replay transport.
SCREEN 04 Analyst Workspace: metric charts, evidence timeline, comparison windows, tactical insight drill-down, data definitions.
SCREEN 05 Fan Experience: simplified match story, favorite team/player filters, language selection, key moments and accessible recap.
SCREEN 06 Broadcast Producer: cue queue, preview, approve/suppress, priority, duration and copy fit indicator.
SCREEN 07 Match Recap: narrative summary, key moments, charts, multilingual variants, export JSON/text.
SCREEN 08 Agent Observatory: agent graph, per-stage status, elapsed time, evidence ids, validation outcomes, fallback reasons.
SCREEN 09 Operator Console: fixture generator seed, replay speed, service health, dead-letter events and usage.
SCREEN 10 About / Methodology: synthetic disclaimer, metric definitions, technology map, licenses and source links.

Core components: AppShell, FixtureSelector, Scoreboard, MatchClock, EventTicker, PitchMap, PossessionBar, MomentumChart, KeyMomentCard, EvidenceDrawer, AgentTrace, NarrativePanel, OverlayCanvas, ReplayControls, LanguageSwitcher, PersonaToggle, ErrorBoundary, Skeletons and EmptyStates.

Design tokens: spacing 4px grid; radii 8/12/16; type 12/14/16/20/28/40; contrast >=4.5:1 for normal text where applicable; no reliance on color alone. Motion respects prefers-reduced-motion. Overlay safe areas target 16:9 and use text truncation rules; render a 1080p preview without requiring copyrighted video.

## 13. Synthetic match generator and replay implementation

Build generator using seeded pseudorandom number source and rule-based possession state machine. Generate fixture metadata and squads with fictional names. Event probabilities depend on current possession, field zone, game clock, team strength parameters and prior events. Include coherent sequences: recovery -> build-up passes -> final-third entry -> shot -> save/goal -> restart. Ensure goals correspond to shots and scores; generate counterattacks, pressure spells and substitutions.

Fixtures to ship: (A) late comeback; (B) possession dominance without goals; (C) red-card momentum swing; (D) high-pressure tactical contest; (E) low-event defensive game. Golden fixture A drives 110-second demo.

Generator reproducibility: command `pnpm generate:fixture --seed 42 --scenario comeback --out fixtures/comeback.json`; validation command `pnpm validate:fixture fixtures/comeback.json`; replay `pnpm replay --fixture fixtures/comeback.json --speed 20`. Commands are proposed repository contracts to implement, not existing commands.

Replay engine tracks applied sequence, virtual clock and playback speed; persists checkpoints; emits ordered events; pauses/resumes without reprocessing; supports seek by loading nearest snapshot and replaying forward. Use clock abstraction for deterministic tests. Handle correction events by invalidating downstream snapshots and re-materializing affected windows; P1 if time permits.

## 14. Infrastructure, deployment and observability

Environment tiers: local, preview, production-demo. For a 7-day hackathon, prefer one Azure resource group and simple Container Apps deployment rather than AKS. Provision Azure Container Registry, Container Apps environment, PostgreSQL Flexible Server, Redis-compatible service if available, Foundry model endpoint, Key Vault, Log Analytics and Application Insights. Verify pricing and quotas before provisioning; disable unnecessary resources after judging.

CI workflow: lint -> typecheck -> unit tests -> contract tests -> build -> dependency scan -> container build -> push -> deploy preview -> smoke tests. Main branch protected if working as a team. Secrets stored in GitHub Actions environment or Azure federated credentials; prefer OIDC to long-lived client secrets.

SLO TARGETS (not guaranteed): event-to-state p95 <500ms locally; state-to-overlay p95 <3s with AI, deterministic fallback <1s; demo availability >=99% during judging; event processing idempotency 100%; zero unsupported numeric claims in golden tests. Measure under documented workload; do not claim targets achieved without evidence.

Telemetry: ingest lag, queue depth, state-update latency, model latency, tokens, cost per fixture, fallback rate, rejected claims, cue delivery lag, SSE disconnects, error rate, uptime. Traces correlate eventId -> insightId -> agentRunId -> cueId. Alerts on queue backlog, repeated model failures and unhealthy demo endpoint.

Security: OWASP API controls, Zod validation, least privilege, no model keys client-side, bounded uploads, CSP, HTTPS, dependency pinning, secret scanning, RBAC for producer/operator, audit logs. Public judge mode read-only except controlled replay actions. Disaster recovery: local fixtures, PostgreSQL backups, mock model fallback and static demo recording.

## 15. Testing, evaluation and quality gates

UNIT: event schema, seeded generator, pass/shot/possession calculations, momentum windows, key-moment rules, time conversion, replay state machine, idempotency, overlay expiry.
INTEGRATION: API -> database -> worker -> state; retry/reconnect; outbox publish; Foundry adapter with stub; cache/queue failure recovery.
CONTRACT: discriminated event unions, agent output JSON schemas, SSE payloads, backward compatibility.
E2E (Playwright): fixture selection, replay, insight emergence, evidence drawer, persona switch, language switch, recap, operator pause/resume, mobile viewport, accessibility smoke.
AI EVAL: groundedness (claim numbers exactly match evidence), entity correctness, factual consistency across personas/languages, unsupported-causality rate, editorial readability, duplicate suppression and translation fidelity. Maintain 30 golden insight cases and adversarial inputs.
PERFORMANCE: event burst, slow client, SSE reconnection, backpressure, worker restart, queue backlog, 20x replay, browser memory leak and accessibility audit.

RELEASE GATES: zero blocker bugs; seeded demo deterministic; no unlicensed media; successful public smoke test; public GitHub code matches deployed build; clean .env.example; no leaked secrets; video <120s; fallback tested with model unavailable; visible synthetic watermark; reproducible README steps.

## 16. Seven-day implementation plan and ownership

OCT 20: verify Innovation Studio access, rules, model quotas, team, repo and branding; scaffold monorepo; finalize P0 contracts; seed fixture generator. Deliverables: runnable local shell, event schemas, fixture A.
OCT 21: ingest API, PostgreSQL schema, replay engine, deterministic match state and basic metrics. Deliverables: events replay into live scoreboard.
OCT 22: key-moment rules, evidence envelopes, pressure/momentum visualizations and agent runtime interfaces. Deliverables: grounded moments and mocked narrative.
OCT 23: integrate Foundry, three core agents, JSON validation, retries, fallback and trace observability. Deliverables: end-to-end agent pipeline.
OCT 24: live studio, overlays, fan/analyst modes, localization, evidence drawer and recap. Deliverables: complete golden path.
OCT 25: Azure deployment, CI/CD, security checks, Playwright tests, responsive polish, metrics and monitoring. Deliverables: public working demo.
OCT 26: freeze features, rehearsals, record video, publish README/architecture, validate judging access, fix blockers. Deliverables: submission-ready package.
OCT 27: final smoke test, submit early, capture confirmation, maintain service through judging. Avoid last-minute submission; Pacific deadline corresponds to the following morning in Lagos, but submit well before it.

If solo: prioritize vertical slice and cut P1 aggressively. If 2–4 contributors: frontend owner, data/football-engine owner, AI/orchestration owner, DevOps/QA owner. Integrate daily. Use a single accountable submission owner.

## 17. Backlog, dependencies and definition of done

Critical path: valid synthetic fixture -> event ingest -> deterministic metrics -> key moment -> grounded AI output -> overlay -> visible dashboard -> deployed demo -> video -> submission.

Suggested issue labels: P0/P1/P2, frontend/backend/data/ai/infra/docs, blocked, good-first-task. Branch pattern feat/<issue>-<slug>; PR template includes acceptance criteria, screenshots, tests, risk and rollback.

Definition of Done per story: implementation merged; typecheck/lint pass; relevant unit/integration/E2E tests pass; API/schema docs updated; accessibility considered; logs and errors handled; no secrets or unlicensed assets; demo scenario verified; product owner accepts AC.

Sample tickets: IQ-001 repo scaffold; IQ-002 contracts; IQ-003 synthetic generator; IQ-004 replay engine; IQ-005 ingest persistence; IQ-006 football metrics; IQ-007 key moments; IQ-008 evidence service; IQ-009 agent orchestrator; IQ-010 Foundry adapter; IQ-011 validation/fallback; IQ-012 SSE; IQ-013 live studio; IQ-014 overlays; IQ-015 persona mode; IQ-016 localization; IQ-017 recap; IQ-018 observability; IQ-019 deployment; IQ-020 demo/submission. Each ticket should be broken into implementation steps and tests by the coding agent before execution.

## 18. Coding-agent implementation operating procedure

SYSTEM CONTEXT FOR AGENT: You are implementing MatchIQ for a time-bound Microsoft + Premier League hackathon. Follow this document as the product contract. Build a real working vertical slice. Do not claim integrations exist until they run. Do not invent API responses or real Premier League data. Use synthetic fixtures and visibly label them. Use strict TypeScript and schema validation. Favor reliable behavior and documented fallbacks over breadth.

EXECUTION LOOP: (1) inspect repo and current branch; (2) select next P0 ticket based on dependency graph; (3) write concise plan with files/tests; (4) implement in small cohesive changes; (5) run lint/typecheck/unit tests; (6) manually or with Playwright verify UI; (7) document exact commands and evidence; (8) commit; (9) report completed/blocked/next. Never silently skip failures.

CODE STANDARDS: TypeScript strict, no implicit any, functional pure football-engine, domain-oriented modules, dependency injection, Zod schemas at boundaries, explicit error types, correlation IDs, UTC wall timestamps plus virtual match clock, no raw model output rendered without validation, tests for edge cases. Use Next.js server/client boundaries carefully. Keep secrets server-only. Follow Tailwind v4 conventions and use reusable accessible components.

AGENT PROMPT — PHASE 1: 'Create the pnpm/Turborepo monorepo matching the specified structure; define fixture and event Zod schemas; implement seeded generator and deterministic validation with tests; add Docker Compose, README and .env.example. Show test output and sample generated fixture.'
AGENT PROMPT — PHASE 2: 'Implement NestJS ingest/replay APIs, PostgreSQL event store, deterministic match-state engine, snapshots and SSE. Add idempotency and reconnection tests. Demo a fixture changing scoreboard and stats.'
AGENT PROMPT — PHASE 3: 'Implement moment detection, evidence envelopes, multi-agent orchestration, Foundry adapter, validation, retries and template fallback. Provide golden-case tests and trace UI.'
AGENT PROMPT — PHASE 4: 'Build the Next.js Live Studio, analyst evidence drawer, fan mode, multilingual narratives, overlay preview and recap. Run Playwright and accessibility smoke tests.'
AGENT PROMPT — PHASE 5: 'Provision Azure deployment with IaC, GitHub Actions, health monitoring, secure configuration and public demo. Produce a 110-second demo shot list and verify all submission gates.'

MANDATORY HANDOFF FORMAT: summary; changed files; commands run; passing/failing tests; screenshots/URLs; known limitations; next 3 tickets; explicit deployment status. Never modify unrelated code without approval.

## 19. Submission assets, pitch and video storyboard

PITCH (draft): 'MatchIQ turns synthetic football events into broadcast-ready intelligence in seconds. A deterministic football engine detects tactical shifts, while coordinated AI agents verify evidence, explain what matters, and produce timed overlays and personalized multilingual narratives. Broadcasters get editorial-ready cues; analysts get traceable evidence; fans get stories tailored to their interests. Built with Next.js, NestJS, Microsoft Foundry and Azure cloud-native services, MatchIQ demonstrates how one trusted event stream can power many football experiences.' Only mention deployed services actually used.

VIDEO (target 110 seconds): 0–10s problem and promise; 10–22s live synthetic fixture and ingest; 22–38s momentum shift and deterministic metric; 38–55s evidence drawer and why moment matters; 55–70s multi-agent trace and quality gate; 70–85s analyst vs fan plus French; 85–97s broadcast overlay cue; 97–106s automatic recap; 106–110s architecture/impact closing. Capture real working app, not Figma mockups. Use captions and licensed/original sound only.

README outline: title, challenge alignment, 60-second overview, architecture diagram, stack, setup, seed/replay commands, Foundry configuration, local mock mode, demo URL, screenshots, API docs, tests, limitations, provenance, license, team credits. Provide public video URL and functioning demo URL in Innovation Studio.

Judge quick-start: open demo URL -> choose 'Late Comeback' -> press Start -> observe timeline and insight -> click evidence -> toggle Casual/Analyst -> switch English/French -> open Overlay Preview -> view Recap -> open Agent Observatory. Keep flow under 90 seconds.

## 20. Risk register and mitigations

R01 Foundry quota/region unavailable — HIGH: validate on day one; mock adapter and templates; keep cloud adapter isolated.
R02 No organizer-provided dataset — HIGH: own seeded synthetic generator; disclose provenance and plausible constraints.
R03 Hallucinated tactical claims — HIGH: deterministic facts, evidence envelopes, schema validator, fallback.
R04 Missed submission deadline — CRITICAL: deploy and upload a day early; maintain checklist and owner.
R05 Video too long or not public — HIGH: target 110 seconds, unlisted/public supported hosting, verify incognito.
R06 Repo accidentally private — HIGH: verify anonymous GitHub access and license/attribution.
R07 Unlicensed team branding/footage — HIGH: fictional teams, generic pitch, original assets, documented permissions.
R08 Over-scoping — HIGH: P0 freeze; no computer vision in MVP.
R09 Agent latency — MEDIUM: precompute deterministic insights, caching, short prompts, queue, template fallback.
R10 SSE disconnects or duplicate events — MEDIUM: event ids, sequence, reconnect and snapshots.
R11 Cloud costs — MEDIUM: budget alert, rate limiting, fixture caps, short-lived services.
R12 Poor demo accessibility — MEDIUM: anonymous access, stable seeded replay, mobile/desktop smoke tests.
R13 Wrong real-world football inference — MEDIUM: synthetic disclaimer and cautious interpretation.
R14 Late agent integration — HIGH: stub all interfaces before cloud calls; integrate vertically from day two.
R15 Jurisdiction/prize terms misunderstood — MEDIUM: independently verify official rules and tax conditions.

## 21. Roadmap beyond the competition

PHASE 2 (30 days): richer synthetic event models, scenario editor, broadcast overlay SDK, producer review workflow, historical analytics, expanded locales, authenticated workspaces and tenant separation.
PHASE 3 (60–90 days): licensing strategy for authorized football feeds, validated analytics models, advanced player movement if lawful tracking is available, calibrated event classifiers, scalable Fabric analytics and enterprise billing.
PHASE 4 (enterprise): SOC2-aligned controls, multi-region availability, formal SLOs, incident response, disaster recovery, customer-specific retention, audit exports, legal review of football data rights, accessibility certification and contractual broadcast integrations.

Potential commercial customers: sports broadcasters, streaming studios, digital sports publishers, clubs and fan engagement platforms. No claim of existing customer traction. Measure time-to-publish, editor acceptance, factual accuracy, engagement and cost per match before pricing.

## 22. References, decisions and assumptions ledger

PRIMARY RULES: https://aka.ms/insidethegame/rules
EVENT: https://aka.ms/insidethegame
LEARNING: https://aka.ms/aisn/hack
MICROSOFT REACTOR: https://developer.microsoft.com/en-us/reactor/series/S-1709/
CODE OF CONDUCT: https://www.microsoft.com/events/codeofconduct
MICROSOFT LEARN: https://learn.microsoft.com/

DECISION D01: use MatchIQ as provisional project name; check trademark and domain before public launch.
D02: synthetic, fictional teams by default to avoid rights issues.
D03: primary submission story is evidence-backed multi-agent broadcasting.
D04: deterministic computations are source of truth; AI writes explanations only.
D05: Azure Container Apps preferred over AKS for time-boxed MVP.
D06: SSE preferred for one-way viewer updates; WebSocket optional for producer control.
D07: prioritize fully functioning golden fixture over broad incomplete features.
D08: English and French are MVP locales; expansion after judging.
D09: all latency and uptime values are engineering targets until measured.
D10: confirm Innovation Studio form and cloud entitlements; do not assume organizer datasets or licenses.

DOCUMENT CONTROL: Version 1.0; authored October 20, 2026; intended audience product owner, software engineers, coding agents, reviewers and hackathon judges. Scope is implementation guidance, not legal advice or proof of eligibility.


---
# OFFICIAL CHALLENGE ALIGNMENT — EXPANDED IMPLEMENTATION ADDENDUM (20 OCTOBER 2026)

> This addendum supersedes earlier assumptions wherever there is a conflict. The user's Innovation Studio challenge brief is the primary source for challenge requirements. Confirm any discrepancies with the binding hackathon rules. The event platform's September 29–November 21 display period is not the submission window: submissions close October 27, 2026 at 11:59 PM Pacific Time; the user-provided milestones state winners announced November 20, while an earlier communication said top-six notification by November 10. Treat these as separate, unverified milestones. Do not assume $50,000 is the first-place prize.

## 23. Challenge compliance matrix and target award strategy

| Challenge requirement | MatchIQ implementation | Evidence for judges | Acceptance gate |
|---|---|---|---|
| Synthetic football-realistic data only | Seeded match generator, event contracts, replay datasets | Dataset provenance panel and README | No real PL event feeds or copyrighted match footage in demo |
| Ingest | WebSocket/HTTP event ingestion and validation | Event timeline, ingestion metrics | Events accepted, deduplicated, ordered, persisted |
| Interpret | Deterministic match-state projector and metric calculators | Stats dashboard with source event IDs | Repeatable calculations and unit tests |
| Explain | Evidence-grounded insight agent and reason codes | Why-this-matters cards with evidence | Every numerical claim traceable to source events |
| Render | Timed overlay JSON plus HTML/CSS broadcast preview | Side-by-side live overlay demo | Schema validation, start/end timestamps, safe area |
| Personalize | Casual, analyst, broadcaster and player-focused modes | Same event, different audience outputs | Material changes in content, not just wording |
| Live match intelligence | Possession, pressure, tempo, pass accuracy/difficulty, speed | Replay and event-driven charts | Update within defined demo latency budget |
| Narrative and recaps | Commentary, key moments, halftime and full-time summaries | Generated narrative and editable producer queue | No invented events; multilingual validation |
| Multi-agent | Distinct analyst, narrator, fact-checker, producer, localization agents | Trace visualizer and agent handoff logs | Handoff, retries, bounded failures, independent review |
| Cloud-native | Azure Container Apps, managed DB, queue/event bus, telemetry | Architecture diagram and deployment manifest | Cloud endpoint works and health checks pass |
| Foundry | Model deployment, evaluation, prompt management where available | Foundry deployment/evaluation evidence | Real integration; no misleading claims |
| Enterprise readiness | RBAC, audit, tenancy boundary, fallback, metrics, runbooks | Admin console and operations notes | Defined reliability and security tests |

**Prize positioning.** Grand Prize First and Second reward overall completeness and Microsoft platform usage. Specialty categories are Best Use of Microsoft Foundry, Best Enterprise Solution, Best Multi-Agent Orchestration, and Best Azure Cloud Native Integration. Design one coherent submission; do not bolt on unrelated features solely to mention services. Prize amounts are per-person and depend on team size; consult binding rules for eligibility, payment and category exclusivity.

## 24. Five-stage event-to-audience pipeline: normative contract

```text
Synthetic generator / imported permitted synthetic fixture
  -> Ingest gateway -> schema validation -> idempotency -> ordered event stream
  -> Deterministic match-state projector -> rolling metrics and evidence ledger
  -> Insight trigger engine -> analyst agent -> verification agent
  -> Producer policy -> overlay scheduler -> versioned overlay payload
  -> Audience policy -> localization agent -> channel-specific delivery
  -> Web UI / analyst workstation / studio graphics / accessible text feed
```

Each event carries `eventId`, `matchId`, `sequence`, `matchClockMs`, `wallClock`, `type`, `teamId`, optional `playerId`, `position`, `attributes`, `source=synthetic`, `generatorVersion`, and `schemaVersion`. `sequence` is authoritative for deterministic replay; `matchClockMs` is used for graphics synchronization. The ingestion boundary rejects invalid events, duplicates and impossible transitions; it quarantines out-of-order arrivals pending a configurable reorder window and surfaces a dead-letter record after expiry. Event schema evolution must be backward compatible or explicitly versioned.

**Stage SLOs (demo targets, not official requirements):** P95 ingest-to-state <= 500 ms; P95 event-to-stat-overlay <= 1.5 s; P95 agent-generated explanation <= 6 s with asynchronous delivery; replay determinism 100% given fixed seed and versions. Degrade gracefully to deterministic prewritten narratives if model APIs are unavailable.

## 25. Football data model, event taxonomy and metric semantics

Event types: `MATCH_STARTED`, `PERIOD_STARTED`, `PERIOD_ENDED`, `PASS_ATTEMPTED`, `PASS_COMPLETED`, `PASS_INTERCEPTED`, `CARRY`, `TACKLE`, `PRESSURE_APPLIED`, `POSSESSION_GAINED`, `POSSESSION_LOST`, `SHOT`, `GOAL`, `SAVE`, `FOUL`, `CARD`, `SUBSTITUTION`, `PLAYER_POSITION`, `BALL_POSITION`, `MATCH_ENDED`. Every event must distinguish observed synthetic facts from inferred values.

Pass distance: Euclidean distance between start/end pitch coordinates, scaled to metres for a declared pitch size. Pass completion: completed passes / attempted passes, excluding null denominators. Pass difficulty: calibrated synthetic score derived from length, passing angle, opponent proximity, pressure and receiver movement; display as a model-derived estimate, not an objective truth. Ball/shot speed: distance divided by elapsed time only when positions and timestamps support it; otherwise `not_available`. Player speed/distance: consecutive player tracking samples with smoothing, plausibility caps and explicit sampling rate. Pressure index: rolling weighted sum of pressure events, territory, turnovers and high-value recoveries; publish formula and window size. Possession: accumulated durations by controlling team, with explicit neutral/unknown periods. Momentum: descriptive composite index, not probability of winning. Explain changes with baseline comparison, top contributing events and counterexamples.

Synthetic fixtures must include: balanced match; late comeback; sustained pressure without scoring; chaotic transitions; red card; substitution-driven shape change; extra-time or stoppage-time case; missing speed data; duplicated and delayed events. Document generator distributions, assumptions, random seed and known biases. Never claim to use official Premier League tracking data.

## 26. Overlay payload and synchronization protocol

```json
{
  "schemaVersion": "1.0.0",
  "overlayId": "ov_match01_000134",
  "matchId": "match01",
  "revision": 1,
  "kind": "TACTICAL_INSIGHT",
  "priority": 70,
  "audienceMode": "BROADCAST",
  "locale": "en-GB",
  "startMatchClockMs": 3742000,
  "durationMs": 7000,
  "expiresAtWallClock": "2026-10-20T11:00:00Z",
  "headline": "Pressure building on the left",
  "body": "Five recoveries in the last six minutes led to three shots.",
  "evidenceEventIds": ["evt_101", "evt_112", "evt_127"],
  "metricRefs": ["pressureIndex.home.rolling6m", "shots.home.rolling6m"],
  "confidence": 0.91,
  "safeArea": {"topPct": 8, "rightPct": 6, "bottomPct": 10, "leftPct": 6},
  "status": "APPROVED"
}
```

`confidence` is a calibrated internal score if available, never a guarantee of factual correctness. Validate `startMatchClockMs`, duration, and schema before display. Overlay scheduler resolves collisions by priority, applies minimum on-screen dwell time, deduplicates repeated insight, suppresses stale graphics after replay seek, and sends `CREATE`, `UPDATE`, `RETRACT` events to clients. Broadcast overlays must avoid unlicensed trademarks, crests, music, and video.

## 27. Personalized audience and player-focused experiences

**Audience dimensions:** persona (`CASUAL`, `ANALYST`, `BROADCAST_PRODUCER`), preferred team, tracked players, locale, accessibility mode, metric interests, spoiler preference, alert frequency and device class. Separate match facts from presentation. The same source insight should produce: casual = one plain-language sentence; analyst = evidence table, formula, sample size and confidence; broadcast = 6–10 second concise overlay plus producer approval state. Player-focused mode follows one player using permitted synthetic `PLAYER_POSITION` and events, displaying touches, involvement, distance and triggered milestones when data is sufficient. No inferred player location when tracking is absent.

**Localization:** canonical structured facts -> localized narrative, not independently recomputed statistics. Initial locales `en-GB`, `fr-FR`, `es-ES`; optional `en-NG`. Glossary preserves football terminology, club/player names and numbers; automated checks confirm statistics, times and proper nouns survive translation. RTL is future scope. WCAG 2.2 AA is a target, with captions and reduced motion.

## 28. Multi-agent orchestration and failure-handling specification

| Agent | Inputs | Outputs | Tools / constraints | Failure policy |
|---|---|---|---|---|
| Match Analyst | Verified rolling match state and evidence IDs | Structured insight candidates with metric references | Read-only state/query tools | Skip candidate on missing evidence |
| Narrative Writer | Approved candidate, audience mode | Short narrative and recap segments | Grounded generation, constrained JSON | Deterministic template fallback |
| Fact Checker | Candidate, narrative, event ledger | `PASS`, `REVISE`, `REJECT` with issues | Recompute numeric claims independently | Reject on unsupported claim |
| Broadcast Producer | Checked insights, overlay queue | Prioritized timed overlay decisions | Scheduling policies and safe-area constraints | Suppress stale or conflicting overlay |
| Localization | Approved canonical narrative and glossary | Localized variants | Locale-specific terminology validation | Serve original with language fallback label |

Orchestrator state machine: `DETECTED -> ANALYZED -> DRAFTED -> VERIFIED -> SCHEDULED -> PUBLISHED` or `REJECTED`, `EXPIRED`, `FALLBACK`. Every transition includes correlation ID, agent version, prompt version, model deployment, evidence IDs, timestamps, token/cost estimate and retry count. Max retries two; apply circuit breaker and rate limits. Avoid parallel agents making contradictory writes to shared state; use optimistic versioning. Trace one successful chain and one failure/recovery chain in the demo. Microsoft Agent Framework/Foundry integration should be genuine, with a local adapter for testing and outages.

## 29. Backend API, stream channels and storage changes

| Endpoint / topic | Method | Responsibility |
|---|---|---|
| `/api/v1/matches` | GET | List synthetic matches and replay metadata |
| `/api/v1/matches/{id}/replay` | POST | Start/pause/seek replay; idempotency key required |
| `/api/v1/matches/{id}/events` | GET | Paginated source events and provenance |
| `/api/v1/matches/{id}/state` | GET | Snapshot and projection version |
| `/api/v1/matches/{id}/insights` | GET | Insights, confidence, evidence and review status |
| `/api/v1/matches/{id}/overlays` | GET | Scheduled overlay payloads |
| `/api/v1/preferences` | GET/PUT | Viewer modes, team/player tracking and locales |
| `/api/v1/producer/overlays/{id}/approve` | POST | Producer approval with audit record |
| `/api/v1/agents/traces/{correlationId}` | GET | Agent execution evidence, sanitized for UI |
| `match.{id}.events` | stream | Validated synthetic events |
| `match.{id}.state` | stream | Aggregated match state deltas |
| `match.{id}.overlay` | stream | Overlay CREATE/UPDATE/RETRACT |

Storage tables/collections: `matches`, `teams`, `players`, `synthetic_events`, `match_snapshots`, `metric_windows`, `insight_candidates`, `insight_evidence`, `agent_runs`, `agent_handoffs`, `overlay_jobs`, `overlay_publications`, `audience_preferences`, `localizations`, `audit_events`, `dataset_versions`. Index `(match_id, sequence)` unique, `(match_id, match_clock_ms)`, and correlation IDs. Persist provenance and generator seed. Use PostgreSQL for authoritative state; Redis for ephemeral replay and fan-out; Azure event infrastructure for production messaging if configured.

## 30. Azure reference deployment and security posture

- Frontend: Next.js deployed on Azure Container Apps or Static Web Apps, with accessible live match UI and broadcaster preview.
- API/replay/worker: separate Container Apps services; queue-based processing to absorb bursty events.
- Models: Microsoft Foundry-managed deployments where available; versioned prompts and evaluation runs. Avoid calling a local mock a Foundry integration.
- Data: Azure Database for PostgreSQL; Redis-compatible cache; Blob Storage for synthetic fixtures and demo exports; optional Microsoft Fabric analytics if time permits.
- Messaging: Azure Service Bus or Event Hubs, selected by throughput/ordering needs; do not require both for MVP.
- Identity/secrets: Entra ID for producer/admin roles where practical, managed identity, Key Vault, least privilege; anonymous read-only demo mode with synthetic data.
- Operations: Application Insights/OpenTelemetry, structured logs, latency dashboards, dead-letter monitoring, alert rules, IaC (Bicep/Terraform), budget limits.

Threats: prompt injection from event text, model hallucinations, cross-tenant data access, websocket authentication bypass, replay abuse, cost spikes, leakage of secrets in public GitHub, and unlicensed football imagery. Controls: schema validation, trusted structured tool responses, bounded prompts, fact-check gate, RBAC, quotas, content security policy, automated secret scanning, and permissive demo data license.

## 31. UX screens, storyboards and acceptance tests

1. **Match Lobby:** select synthetic fixture, seed, replay speed; visible synthetic-data label. AC: seeded fixture loads with deterministic scoreboard.
2. **Live Match Center:** clock, score, pitch event map, possession, pressure, event timeline. AC: live event updates stay ordered and replay seek resets state.
3. **Explain This Moment:** insight card shows plain-language claim, source events, formula and counterfactual caveat. AC: unsupported claims never publish.
4. **Broadcast Studio:** 16:9 graphics-safe preview, overlay queue, approval, publish/retract. AC: overlay appears at scheduled match clock and respects safe area.
5. **Personalization:** casual/analyst/broadcast toggle, tracked player, locale and favorite team. AC: same event produces substantively different presentations.
6. **Player Focus:** touch timeline, involvement map and optional speed/distance. AC: missing tracking data displays not available.
7. **Recap Builder:** halftime/full-time chapters, key moments, citations, downloadable structured recap. AC: recap references only ingested events.
8. **Agent Trace & Reliability:** chain visualization, verification rejection, fallback and latency. AC: one injected agent failure recovers without breaking match UI.
9. **Dataset Lab:** generator seed, scenario controls, event-schema inspector, provenance export. AC: fixture can be reproduced exactly.
10. **Operations/Admin:** service health, cost budget, audit and latency. AC: protected actions require role.

## 32. Engineering epics and sprint-ready stories

| ID | Priority | Story | Definition of done |
|---|---|---|---|
| E01 | P0 | Define typed football event schemas and validation | JSON Schema/Zod, examples, compatibility tests |
| E02 | P0 | Build seeded synthetic match generator | Eight scenarios, provenance, deterministic golden tests |
| E03 | P0 | Build event ingestion and deduplication | Ordering, idempotency, quarantine, audit |
| E04 | P0 | Implement state projector and rolling stats | Unit tests for possession, pass quality and pressure |
| E05 | P0 | Build Match Center with replay controls | Live scoreboard, pitch/timeline, seek-safe updates |
| E06 | P0 | Generate evidence-grounded insights | Reason codes, evidence IDs, source drill-down |
| E07 | P0 | Implement writer and independent fact checker | Structured outputs, rejection and fallback demo |
| E08 | P0 | Render broadcast overlays | Versioned timed JSON and safe-area preview |
| E09 | P0 | Implement persona modes | Casual, analyst, broadcast distinctions validated |
| E10 | P0 | Deploy public working demo | Stable URL, health checks, seeded demo |
| E11 | P1 | Foundry model deployment and eval | Recorded configuration, eval metrics and trace |
| E12 | P1 | Producer agent scheduling and approval | Queue, collisions, publish/retract audit |
| E13 | P1 | Player-focus mode | Player events and truthful missing-data behavior |
| E14 | P1 | Localization to three languages | Numeric and glossary consistency tests |
| E15 | P1 | Agent observability and failure recovery | Handoff trace, retry cap, deterministic fallback |
| E16 | P1 | Cloud-native IaC and operations | Repeatable deployment and rollback runbook |
| E17 | P2 | Video auto-eventing experiment | Only if permitted footage and time allow |
| E18 | P2 | Fabric analytical reporting | Real integration, documented query/value |

## 33. Evaluation harness and measurable demonstration

Offline replay suite must measure event completeness, duplicate rejection, projection correctness, numeric hallucination rate, narrative grounding, locale numeric preservation, overlay lateness, overlay collisions, P50/P95 latency, replay determinism, agent recovery success and cost per match. Targets for MVP: 100% reproducible seeded replay; 100% published numeric claims backed by metric references; zero overlay collisions in scripted demo; all three persona modes visibly different; one tested failure fallback; a working public demo and public source repository. Do not misrepresent synthetic demo benchmark results as real-world performance.

**Scripted demo (target 105–115 seconds):** 0–12s problem and synthetic fixture; 12–28s ingestion and live stats; 28–48s pressure pattern explained with source events; 48–65s synchronized studio overlay; 65–81s casual vs analyst vs player focus; 81–97s agent handoffs and fact-check failure recovery; 97–110s Azure/Foundry architecture, public repo and impact. Include subtitles and no unlicensed music or trademarks.

## 34. Submission checklist and schedule (Nigeria / Pacific Time)

Submission cutoff October 27, 2026 at 11:59 PM Pacific Daylight Time (PDT, UTC-7) corresponds to **October 28, 2026 at 7:59 AM Lagos time (WAT, UTC+1)**. Submit well before cutoff, ideally October 27 Lagos time. Registration is already confirmed by the user. The hackathon platform shows 1,532 registrants and 399 projects at the time of the supplied screenshot/text; these are a snapshot, not current verified totals.

- [ ] Confirm category and any exclusivity rules on Innovation Studio.
- [ ] Link the project to `The Synthetic Match Insights Engine for Premier League Studio` challenge.
- [ ] Verify team roster and individual eligibility.
- [ ] Make GitHub repository public; remove keys, personal data, licensed footage and internal links.
- [ ] Publish accessible hosted application and synthetic fixture replay instructions.
- [ ] Publish public video shorter than 120 seconds showing the app functioning.
- [ ] Include pitch, Microsoft/Azure services actually used, problem, differentiator and deployment link.
- [ ] Add architecture diagram, setup instructions, sample env, test commands, licenses, AI-use disclosure and dataset provenance.
- [ ] Test demo anonymously in incognito on mobile and desktop.
- [ ] Confirm final submission saved and project linked to the correct challenge.

## 35. Seven-day execution plan and hard trade-offs

- **Oct 20:** Freeze scope; repo, contracts, synthetic fixture and deployment skeleton.
- **Oct 21:** Ingestion, deterministic projection, replay engine and metrics tests.
- **Oct 22:** Live Match Center and explanation evidence panel.
- **Oct 23:** Real Foundry model integration, analyst/writer/checker pipeline.
- **Oct 24:** Timed broadcast overlay engine and producer preview.
- **Oct 25:** Persona switching, localization, agent traces and fallback; cloud hardening.
- **Oct 26:** E2E testing, public deployment, README, submission pitch and video capture.
- **Oct 27:** Buffer for fixes and submit early; no major new features.

**Cut scope in this order if behind:** video-based auto-eventing, Fabric, complex player tracking, advanced localization, nonessential dashboards. Never cut deterministic synthetic data, end-to-end pipeline, evidence-backed explanations, timed overlays, clear personalization, public demo, or video submission. Treat any unavailable Azure credit/Foundry access as a blocker to surface immediately, not an excuse to falsely claim integration.

## 36. Agent-ready execution directive

> Implement MatchIQ from this specification as a working, tested monorepo. Begin by inspecting the existing repository; do not overwrite unrelated code. Produce an ADR for unresolved technology decisions. Implement E01–E10 first, with E11–E16 as time allows. Maintain typed contracts shared across services; prefer testable deterministic computation for football facts, and use AI only for grounded explanation, editorial judgment and localization. At the end of each epic, run lint, typecheck, unit tests and smoke tests; report actual commands and failures. Do not claim Azure/Foundry integration unless deployed and exercised. Record demo credentials only in secure configuration, never in the public repo. Preserve the official synthetic-only restriction and build the public demo and submission artifacts before adding P2 features.

## 37. Source precedence and open verification items

1. Binding official rules: https://aka.ms/insidethegame/rules
2. Challenge brief provided by registered participant, including detailed five-stage pipeline and award descriptions.
3. Innovation Studio challenge page: https://innovationstudio.microsoft.com/hackathons/insidethegamedeveloperhackathon/home/executive_challenges
4. Event code of conduct and security policy linked in the challenge.

**Open checks:** Whether all category prizes can be won simultaneously; exact team eligibility by country; availability/credits for Microsoft Foundry; whether an anonymous demo endpoint is allowed; any required presentation or technical attachments; whether the November 10 shortlist and November 20 winner dates remain current. Avoid assuming that the platform event end date of November 21 extends the October 27 submission deadline.


# ENTERPRISE MASTER SPECIFICATION V3 — COMMERCIAL PRODUCT AND DELIVERY ADDENDUM

> The original 37 sections are retained. Sections 38–58 expand commercial viability, contracts, security, operations, and execution. All numeric targets are proposed and unmeasured until verified.

## 38. Enterprise product charter, boundaries and decision principles

**Mission:** Convert authorized football event streams into trustworthy, low-latency, context-aware match intelligence for broadcast operators, streaming products, analysts, and fans. **System of record:** validated event ledger and deterministic derived facts; LLMs are not the source of truth. **Commercial promise:** shorter time to publish verified insights, consistent experiences across channels, measurable editorial productivity.

**Explicit non-goals:** replacing licensed data vendors; representing synthetic matches as real; guaranteeing outcomes; using unlicensed broadcast video; inferring biometric/player tracking measures without tracking data; fully autonomous on-air publishing without configurable editorial policy.

**Architecture invariants:** (I1) every published quantitative claim resolves to a metric version and evidence IDs; (I2) tenant-scoped access on every read/write; (I3) events are immutable and corrections are append-only; (I4) time synchronization has explicit clock source and drift tolerance; (I5) all LLM responses are structured and schema validated; (I6) core match playback functions without LLM access; (I7) data source and rights scope are carried into downstream artifacts; (I8) no external source is assumed available until contractual authorization.

**Release gates:** Hackathon demo is not production certification. Enterprise launch requires licensed data contract, security assessment, tenant isolation penetration test, observed load testing, SLO burn-in, customer pilot acceptance, and documented on-call ownership.

**Decision rights:** product owner approves scope and claims; technical lead owns interfaces and ADRs; football subject matter reviewer approves metric semantics; security owner approves trust boundaries; editorial operator controls publish policy. Solo-founder mode can assign multiple roles to one person but must record independent review exceptions.

## 39. Commercial market, buyers, JTBD and validation plan

| Segment | Economic buyer | User | Job to be done | Proof of value |
|---|---|---|---|---|
| Sports broadcaster | Head of production | Producer, graphics operator | Publish trustworthy context before replay ends | Cue creation time; override rate |
| OTT streaming platform | VP Product | Fan, personalization lead | Improve engagement with localized insights | Feature engagement, retention lift in controlled pilot |
| Football analytics provider | Product director | Analyst | Explain tactical swings with reproducible evidence | Analyst minutes saved; evidence accuracy |
| Club / academy | Performance director | Coach / analyst | Review synthetic or licensed event sequences | Review throughput, decision usefulness |
| Developer integrator | Engineering manager | API developer | Integrate stable football intelligence APIs | Time to first insight; error rate |

**Discovery protocol:** conduct at least 5 interviews per priority segment before claiming product-market fit. Record workflow, current tools, data licenses, live production tolerances, procurement blockers, budget owner, and willingness-to-pay signal. Run 2 design-partner pilots with signed evaluation criteria. Separate 'would use' from purchasing intent. Do not claim measured ROI without baseline and controlled pilot.

**Commercial packaging hypotheses (not established prices):** Developer sandbox (synthetic fixtures and quota); Studio API (licensed feed connectors, usage metering, support); Broadcast Enterprise (SLA, private networking, SSO, approval controls); Consumer SDK licensing. Price based on fixtures processed, concurrent streams, AI tokens, language variants, peak overlay events, support tier, and data license pass-through. Model gross margin with vendor licensing as a separate line item.

**ROI model:** monthly customer value = (hours saved × loaded labor rate) + (incremental measurable revenue) − (integration costs + subscription + data license). Pilot must document attribution limits and counterfactuals. **Sales motion:** discovery → security/rights assessment → synthetic sandbox → licensed-data POC → paid pilot → production contract.

## 40. Product roles, tenancy, authorization and consent

**Tenant hierarchy:** Organization → Workspace → Fixture → Feed/Publication. User belongs to organizations through memberships. Tenant_id is mandatory on every business record except global public catalog; database row-level security is recommended as defense in depth, not a substitute for application authorization.

| Role | Read | Write | Publish | Admin |
|---|---|---|---|---|
| Platform operator | Redacted platform diagnostics | System config | No editorial rights | Platform only |
| Tenant owner | Tenant resources | Users, billing, policies | Configure policy | Yes |
| Producer | Assigned fixtures | Cue schedules, overrides | Approve/retract | No |
| Analyst | Assigned fixtures | Draft insights, annotations | No | No |
| Developer | API resources by scope | Ingest/test feeds | Scoped sandbox only | No |
| Viewer | Entitled published outputs | Preferences | No | No |

**Policy checks:** subject organization, role, resource tenant, fixture entitlement, data rights, environment, action, and publication status. Every cross-tenant lookup must return non-disclosing 404 or authorization error. Use Entra ID/OIDC for enterprise sign-in; short-lived access tokens, rotated refresh credentials, scoped service identities; machine clients use OAuth2 client credentials. Anonymous hackathon demo accesses only a dedicated synthetic demo tenant with read-only quotas.

**Acceptance tests:** user A cannot query B's fixture by guessed ID; producer cannot change billing; viewer cannot see unpublished narratives; service credentials cannot access other tenant; revoked memberships invalidate access; audit log records privileged actions with actor, tenant, correlation ID and before/after references.

## 41. Canonical domain model and database migration contract

**Bounded contexts:** Identity & Organizations; Data Rights & Providers; Fixture/Event Ingestion; Match Analytics; Agent Runs & Evidence; Editorial/Overlays; Personalization; Metering & Billing; Audit & Operations.

**Relational schema (logical, UUID PK unless otherwise specified):** organizations(id,name,status,region,created_at); memberships(id,org_id,user_id,role,status); provider_contracts(id,org_id,provider,rights_json,valid_from,valid_to); fixtures(id,org_id,source_id,source_fixture_id,synthetic,clock_state,home_team_id,away_team_id,version); players(id,org_id,team_id,display_name,synthetic); events(id,org_id,fixture_id,source_event_id,seq,period,match_clock_ms,occurred_at,type,payload_json,provenance_json,ingested_at,correction_of); snapshots(id,org_id,fixture_id,through_seq,algorithm_version,metrics_json,created_at); insights(id,org_id,fixture_id,insight_type,evidence_json,metric_version,status,confidence,created_at); agent_runs(id,org_id,insight_id,agent,model,version,latency_ms,tokens_in,tokens_out,cost_estimate,status,trace_id); narratives(id,org_id,insight_id,persona,locale,text,status,reviewed_by); overlay_cues(id,org_id,fixture_id,insight_id,clock_start_ms,clock_end_ms,priority,payload_json,status,revision); preference_profiles(id,org_id,user_id,locale,team_ids,player_ids,mode); outbox(id,org_id,topic,key,payload,status,attempts); audit_events(id,org_id,actor_id,action,target_type,target_id,request_id,created_at,details_json); usage_records(id,org_id,period,metric,quantity,source_id).

**Indexes:** events UNIQUE(org_id,fixture_id,source_event_id), UNIQUE(org_id,fixture_id,seq) where applicable; snapshots UNIQUE(org_id,fixture_id,through_seq,algorithm_version); overlay_cues(org_id,fixture_id,clock_start_ms); agent_runs(org_id,trace_id); outbox(status,created_at). Partition large event tables by time or fixture volume only when profiling demonstrates need. Foreign keys and tenant consistency validated in migrations.

**Migration discipline:** numbered reversible migrations; additive changes first; deploy read-compatible application before removing old fields; backfill in bounded batches; migration rollback rehearsed on synthetic snapshot; data retention policy enforced by tenant and license. Store provider raw payload separately with controlled TTL when contract permits.

## 42. Data provider licensing, provenance and synthetic-to-live transition

**Data rights gate:** provider legal agreement must explicitly cover ingestion, derivation, transformation, model prompts, redistribution of statistics, graphics, archival, geography, and commercial use. The hackathon synthetic requirement does not confer Premier League or broadcaster rights. Use invented club names and player identities in public demo unless authorized.

**Provider adapter contract:** authenticate → receive/poll → map to canonical schema → preserve raw source hash and license reference → validate → deduplicate → assign ingest sequence → publish. Adapters expose capabilities {events,tracking,video,ballSpeed,playerIdentity,corrections} so UI does not imply unavailable metrics. `sourceFixtureId` and `sourceEventId` are provider-specific; canonical IDs are internal.

**Provenance chain:** {providerId, providerEventId, licenseId, sourceTimestamp, ingestionTimestamp, mappingVersion, checksum, syntheticFlag, generatorSeed?}. Propagate `syntheticFlag` and license scope to every insight, recap and export. All demo graphics must visibly label synthetic/simulated.

**Reconciliation:** duplicate event → idempotent acknowledge; out-of-order → buffer by bounded watermark then replay; correction → append correction referencing original and recompute affected snapshots; gap → mark state provisional and alert; feed disconnect → stale indicator and safe fallback; revoked rights → stop distribution and apply contractual deletion rules.

**Provider qualification checklist:** latency p50/p95, event completeness, correction rate, uptime, metadata richness, coverage, historical replay availability, terms, per-match pricing, and operational escalation.

## 43. Football computation definitions and evidence policy

**Coordinate standard:** normalized pitch x=0..100 from home left-to-right in first half; preserve original source orientation; transform by team attack direction and period. Distance requires actual pitch dimensions; default 105×68 m is an explicitly labeled synthetic fixture parameter, not a universal constant.

**Passing:** attempted pass = accepted PASS_ATTEMPTED; completed = attempt linked to PASS_COMPLETED by attemptId; completion rate = completed/attempted or null when zero. Distance = Euclidean source-target in meters using configured pitch dimensions. Pass difficulty is a calibrated heuristic using distance, angle, pressure, receiving zone, opponent proximity when available; output 0..1 and a model/version label. Never call a heuristic an observed fact.

**Possession:** preferred ball-in-play time-weighted possession segments; numerator sum of controlled seconds for team, denominator sum of controlled seconds for both teams; contested/unknown shown separately. Event share is labeled proxy, not possession time. **Pressure:** count pressure events with thresholds and window definitions; intensity per minute in rolling 5-minute window; **Momentum:** transparent weighted score from shots, final-third entries, recoveries and pressures normalized by event opportunity; do not imply causal proof.

**Shot speed:** only from valid speed measurement or synthetic event attribute with units; otherwise null/unavailable. **Player speed and distance:** only with tracking samples and documented sampling quality; never infer from isolated passes. **xG:** optional calibrated model with training data rights, dataset card, reliability diagram and version; not required for MVP.

**Insight evidence contract:** metric IDs, event IDs, time window, computation version, denominator, sample size, limitations, confidence type (statistical vs model heuristic), and counterevidence. Rule examples: 3 recoveries and 2 final-third entries within 180 seconds → 'pressure increase' candidate, not proof of domination. Narrative cannot claim a goal, player speed, injury, or result absent validated facts.

**Golden fixtures:** 0-event match, rapid goal sequence, corrections, red card, extra time, out-of-order events, simultaneous pressures, tied possession, and unavailable tracking. Each fixture has expected state hashes and narrative fact assertions.

## 44. Streaming, temporal semantics and broadcast synchronization

**Clock model:** eventTime UTC, receivedAt UTC, matchClockMs, period, replaySpeed, fixtureClockRevision. Use event-time windows for metrics, processing-time for latency SLOs. Period clock is authoritative for overlay alignment. Detect drift between event clock and display clock; correction emits resync notice.

**Transport:** HTTP for commands/snapshots; SSE for simple browser subscriptions (Last-Event-ID resume); WebSocket optional for bidirectional producer controls; Azure messaging for durable asynchronous work. Event envelope includes eventId, orgId, fixtureId, schemaVersion, sequence, eventTime, payload, traceId. At-least-once delivery; consumers idempotent; never claim exactly-once network delivery.

**Proposed targets to validate, not measured SLAs:** P95 ingest-to-updated-stat <= 1.5 s at synthetic demo load; P95 eligible insight-to-overlay <= 4 s with AI, <= 1 s deterministic fallback; client drift <= 250 ms during demo; no stale overlay displayed after cue expiry. Specify test load (e.g. 20 events/sec across 10 fixtures) and measure before publishing performance claims.

**Overlay state machine:** DRAFT → VERIFIED → APPROVED/AUTO_APPROVED → SCHEDULED → LIVE → EXPIRED; exceptional RETRACTED and FAILED. Priority: safety/retraction > score corrections > editorial cue > contextual stat. `clockStartMs`, `clockEndMs`, `maxDisplayMs`, `priority`, `locale`, `persona`, `safeArea`, `evidenceIds` mandatory. Consumer rejects stale revision; duplicate cue is no-op. Producer can pause/retract with audit trail.

**Failover:** feed outage → stale badge; LLM outage → deterministic template narrative; queue backlog → drop low-priority commentary, preserve facts; out-of-order replay → rehydrate snapshot and rebuild cues; graphics disconnect → resumable cue stream. Never block event ingestion on model inference.

## 45. API and integration specification with examples

**API conventions:** `/v1`, RFC7807-style errors, `X-Request-ID`, `Idempotency-Key` on writes, cursor pagination, UTC timestamps, semantic versioning, tenant scoping from auth context (never trust client-supplied org ID). Authentication required outside demo public read endpoints. OpenAPI is generated and validated in CI.

| Method | Endpoint | Purpose | Required scope |
|---|---|---|---|
| POST | /v1/fixtures | Create synthetic fixture | fixtures:write |
| POST | /v1/fixtures/{id}/events:batch | Ingest validated events | events:ingest |
| GET | /v1/fixtures/{id}/snapshot | Latest deterministic state | fixtures:read |
| GET | /v1/fixtures/{id}/events | Event ledger, paginated | fixtures:read |
| GET | /v1/fixtures/{id}/stream | SSE live updates | fixtures:read |
| GET | /v1/fixtures/{id}/insights | Evidence-linked insights | insights:read |
| POST | /v1/insights/{id}/review | Approve/reject | editorial:approve |
| GET | /v1/fixtures/{id}/overlays | Current/scheduled cues | overlays:read |
| POST | /v1/overlays/{id}/retract | Retract live cue | editorial:publish |
| PUT | /v1/me/preferences | Persona and locale | preferences:write |
| GET | /v1/usage | Usage/metering | billing:read |

**POST events request:** `{"schemaVersion":1,"fixtureId":"fx1","events":[{"eventId":"e42","sequence":42,"type":"SHOT","period":1,"matchClockMs":1800000,"teamId":"blue","playerId":"p9","attributes":{"speedKph":97.2},"provenance":{"synthetic":true,"seed":123}}]}`. **Response:** HTTP 202 `{"accepted":1,"duplicates":0,"rejected":0,"ingestionId":"ing_...","lastAcceptedSequence":42}`. Bad schema → 422 with field paths; conflict on reused eventId with changed body → 409; over quota → 429 with Retry-After.

**SSE example:** `id: 892
event: insight.verified
data: {"fixtureId":"fx1","insightId":"in_17","clockMs":1800000,"evidenceEventIds":["e42"],"synthetic":true}`. Clients resume from Last-Event-ID and fall back to snapshot on gap. Webhook signatures use HMAC SHA-256 with timestamp tolerance, secret rotation and replay protection.

**SDK acceptance:** typed TypeScript SDK, request retries for safe operations, exponential backoff with jitter, error taxonomy, and minimal example integrating stream + overlay. Contract tests run consumer fixtures against published OpenAPI.

## 46. Multi-agent runtime, guardrails and evaluation contract

**Pipeline:** trigger candidate insight → deterministic facts package → tactical agent → narrative agent → independent verifier → personalization agent → editorial policy → overlay scheduler. Separate inference from state mutation; agents return proposals, services own commits.

**Agent interface:** input {runId,fixtureId,tenantId,metricSnapshotId,evidenceIds,persona,locale,deadlineMs,policyVersion}; output {schemaVersion,claimType,claims[],supportingEvidenceIds[],limitations[],language,confidenceLabel,traceId}. Validate JSON schema, whitelist evidence IDs, block unknown players/teams, re-evaluate numeric claims with deterministic engine. If verification fails, regenerate once then use rule-based fallback or suppress.

**Shared state:** immutable fact packet and versioned run state, not unrestricted free-form agent memory. Handoffs include reason, input checksum, execution deadline and idempotency key. Max hops, max tokens, cost budget and cancellation are enforced centrally. A2A interoperability is optional; do not introduce it unless demonstrably useful.

**Evaluations:** fact precision >= 99% on golden synthetic fixture assertions (target); unsupported numerical claims = 0 in gated test set; locale correctness; contradictory narration count; P95 end-to-end latency; fallback success; cost per 90-minute fixture; prompt injection rejection. These are acceptance targets, not current measurements. Use adversarial test strings embedded in untrusted event metadata to verify they cannot instruct agents.

**Model governance:** approved Foundry model deployment with version pinning, region/data residency assessment, prompt version registry, offline evaluation before promotion, content filtering, no customer PII in prompts unless explicitly authorized. Store sanitized traces, latency and token use; redact secrets and provider-protected content.

## 47. Screen-by-screen functional specification and UX states

| Screen | Primary user | Main controls | Empty/error/loading behavior | Acceptance |
|---|---|---|---|---|
| Landing / Demo | Judge | Start replay, explore product | CTA when demo offline | <3 clicks to active match |
| Live Match Studio | Producer | Fixture, timeline, cue queue, approve/retract | Reconnecting banner; snapshot recovery | Overlay follows match clock |
| Tactical Analyst | Analyst | Windows, pass map, pressure trend, evidence drawer | Null metric labelled unavailable | Click insight reveals evidence |
| Fan Mode | Fan | Favorite team/player, language, complexity | Preferences default safely | Same facts, different phrasing |
| Player Focus | Fan/analyst | Player picker, event filters, player timeline | No tracking badge when absent | No invented speed/distance |
| Broadcast Preview | Producer | Safe area, overlay template, timing, preview | Placeholder when no approved cue | 16:9 cue respects safe zone |
| Match Recap | All | Recap, moments, language, export | Fallback deterministic recap | Every claim linked to events |
| Agent Trace | Developer/judge | Timeline, roles, handoffs, verification | Masked prompts/secrets | Trace explains decision chain |
| Organization Admin | Owner | Roles, sources, entitlements | Access denied by role | Tenant isolation enforced |
| Usage & Reliability | Operator | Cost, lag, failures, alerts | Explicit no-data state | Data timestamps visible |

**Accessibility:** WCAG 2.2 AA target; keyboard-operable controls, focus order, screen-reader announcements for significant updates (throttled), high contrast, color-independent indicators, reduced-motion option, subtitles/transcripts for audio, and RTL readiness where applicable.

**Design system:** spacing tokens 4/8/12/16/24/32; typography scale 12/14/16/20/28/36; semantic status tokens; 16:9 broadcast-safe grid; responsive 360/768/1280/1920 breakpoints. Never encode the only meaning of a tactical metric with color. Loading skeletons and stale-data badges distinguish pending, unavailable, and disconnected states.

**Screen acceptance example:** given 5-minute synthetic replay, when analyst clicks 'pressing shift', show event window, pressure counts, baseline comparator, metric definition, and confidence/limitations; when changing to fan mode, numbers remain unchanged while prose complexity changes.

## 48. Security architecture, threat model and privacy

**Threats and controls:** cross-tenant IDOR → tenant-bound queries and automated tests; token theft → short-lived tokens and revocation; event spoofing → signed provider requests, allowlisted source credentials and deduplication; prompt injection → untrusted data isolation, strict tools, output validation; SSRF in provider connector → egress allowlist; secret leakage → managed identity and Key Vault; denial-of-service → quotas, per-tenant rate limits, bounded queues; model data exfiltration → prompt minimization and provider controls; editorial tampering → role approvals, append-only audit; malicious dependencies → lockfile, SCA, signed CI artifacts.

**Baseline controls:** TLS 1.2+, encryption at rest, managed identities, private endpoints for production where feasible, WAF/rate limiting, CSRF protections on cookie sessions, secure CORS, CSP, security headers, request-size limits, schema validation, audit retention and least privilege. SAST, dependency scan, container scan and secret scan in CI; DAST against staging; pentest before commercial launch.

**Privacy:** user preference profiles may be personal data; collect minimum necessary, state purposes, retention and deletion processes; separate operational telemetry from identity; log redaction; subject access/deletion workflow; review GDPR/UK GDPR/NDPR applicability with counsel based on markets. No claim of compliance certification before assessment.

**Incident severity:** SEV1 data breach or unauthorized on-air cue; SEV2 widespread outage or materially false insight; SEV3 degraded feature. Each incident needs commander, customer notification decision, containment, evidence retention, recovery, and postmortem. Test access revocation, secret rotation, and cue kill switch.

## 49. Cloud architecture, IaC, environments and disaster recovery

**Environments:** local (Docker Compose + mock Foundry), dev (shared low-cost Azure), staging (production-like synthetic), production (licensed data only when authorized). Separate subscriptions/resource groups, secrets, identity and telemetry; no production credentials in developer machines or public repo.

**Azure reference:** Frontend/API/worker on Azure Container Apps; PostgreSQL Flexible Server; Azure Service Bus for durable work (Redis/BullMQ is valid for MVP but assess operational fit); Blob Storage for authorized fixture exports; Foundry model deployments; Key Vault; Application Insights/Log Analytics; Azure Monitor alerts; Front Door/WAF as scale requires. Fabric optional analytics sink; do not block live pipeline on Fabric batch processing.

**IaC:** Bicep modules for network, identities, DB, queue, app, model endpoint reference, monitoring and secrets; parameter files by environment; `what-if` on PR; deployment with OIDC federation; avoid checked-in secrets. CI: lint → typecheck → unit → contract → integration → security → build → deploy staging → smoke → approval → production. Record image digest, migration version and feature flags in release manifest.

**Recovery objectives (proposed, subject to customer agreement):** RPO <= 15 minutes for durable business data; RTO <= 4 hours for enterprise beta; faster failover requires funded multi-region architecture. Daily backups and point-in-time recovery as supported, quarterly restore drills, tested queue replay, documented region failure procedures. Live streams can degrade to cached verified overlays; no promise of uninterrupted AI narration.

**Capacity plan:** benchmark synthetic 10, 100, 1000 concurrent fixtures; characterize event rate, P95 CPU, queue depth, database writes, Foundry concurrency and cost. Scale API on HTTP concurrency, worker on queue depth, model usage with rate-limit-aware queue. Prevent noisy neighbor via per-tenant concurrency quotas.

## 50. Observability, SLOs and operational runbooks

**SLIs:** ingest availability; accepted event completeness; stream freshness; end-to-end overlay latency; narrative verification success; cue correctness; SSE reconnect success; tenant isolation violations; model cost per fixture. **Proposed beta SLOs (validate by pilot):** API 99.9% monthly availability; P95 stat freshness <= 2s under specified load; >= 99.5% event ingestion success excluding invalid input; 100% published numerical claims evidence-linked; overlay cue delivery >= 99.5% in supported demo conditions.

**Dashboards:** per tenant/fixture: input events/sec, late events, queue lag, snapshot revision, insight latency, token spend, error budget burn, stale streams, manual overrides. Trace propagation through ingest→aggregate→agent→cue via W3C trace context. Do not store raw licensed payloads in logs.

**Runbooks:** (1) stream stalled: verify provider heartbeat, queue depth, consumer offsets, enable stale banner and replay; (2) model throttled: cap concurrency, deterministic fallback, budget alarm; (3) invalid overlay: retract, freeze auto-publish, audit and recompute; (4) database degraded: stop nonessential writes, restore/replay, verify snapshot hashes; (5) compromised credential: revoke, rotate, review audit, assess notification; (6) license expired: disable affected downstream outputs and preserve compliance evidence.

**Operational ownership:** designate primary and secondary on-call, escalation thresholds, incident communication templates, maintenance window and change freeze for live events. Weekly reliability review, monthly security review, quarterly DR exercise.

## 51. Billing, usage metering and unit economics

**Metering events:** fixture_minutes_processed, ingested_events, insight_generations, model_input_tokens, model_output_tokens, language_variants, overlay_cues, API_calls, GB_stored, concurrent_stream_peak. Usage record includes orgId, product, meter, quantity, unit, sourceId, timestamp, pricingVersion; deduplicate sourceId and reconcile to provider invoices.

**Example model (illustrative, not actual vendor prices):** per-match cost = compute + database/queue + model inference + storage/egress + provider rights allocation + support. Gross margin = contracted revenue − direct delivery cost; sensitivity analysis varies concurrency, average events/minute, model token budget, localization count and licensing. Define monthly cost guardrails and hard quota responses; never silently exceed contracted budget.

**Billing acceptance:** usage ledger is immutable, retries do not double bill, customer can export usage, quota exhaustion returns explicit error and fallback, invoices reconcile to metering, credit/refund is auditable. Initial hackathon build needs cost telemetry, not a live payment gateway.

## 52. Testing pyramid, verification fixtures and release gates

| Test layer | Minimum suite | Exit gate |
|---|---|---|
| Unit | metric math, period clock, corrections, idempotency | all golden fixtures pass |
| Property-based | valid event generator invariants, monotonic scores | zero counterexamples in configured runs |
| Contract | OpenAPI and SSE schemas, SDK compatibility | no breaking change |
| Integration | Postgres/outbox/queue/worker, Foundry mock | deterministic replay reproducible |
| E2E | producer approval, analyst evidence, fan locale, recap | P0 flows green |
| Load | event burst, 10 fixtures demo, reconnect storms | measured targets met |
| Chaos | model unavailable, duplicate/late events, queue outage | graceful degradation |
| Security | tenant isolation, injection, auth scopes, secret scan | no critical/high unresolved |
| AI evaluation | hallucination, contradiction, multilingual fidelity | numerical claims verified |
| Accessibility | keyboard, axe, screen-reader smoke | no critical blockers |

**Golden replay protocol:** seed fixture; replay at 1× and 30×; persist snapshots and cue sequence; compare deterministic state hashes; allow only narrative wording variance; assert source evidence and numerical claims identical. Include test evidence and screenshots in release report.

**Definition of Done for every story:** implementation merged, schema/contracts updated, positive/negative tests, observability, docs, accessibility/security review as applicable, demo instructions, acceptance evidence and no P0/P1 regressions.

## 53. Engineering backlog with dependencies and executable acceptance

| ID | Priority | Story | Depends on | Verification |
|---|---|---|---|---|
| MQ-001 | P0 | Monorepo + CI + Docker | none | fresh clone boots, CI green |
| MQ-002 | P0 | Canonical Zod event schema | 001 | rejects invalid actor/clock/type |
| MQ-003 | P0 | Seeded synthetic generator | 002 | same seed yields same event hash |
| MQ-004 | P0 | Event ledger + idempotent ingest | 002 | duplicate unchanged, conflict rejected |
| MQ-005 | P0 | Deterministic metrics engine | 003,004 | golden fixture exact expected values |
| MQ-006 | P0 | SSE and snapshot reconciliation | 004,005 | reconnect catches missed events |
| MQ-007 | P0 | Key moment rules + evidence | 005 | candidate references source IDs |
| MQ-008 | P0 | Foundry adapter + mock | 007 | schema valid, fallback works |
| MQ-009 | P0 | Agent handoffs + verifier | 008 | invalid claim suppressed |
| MQ-010 | P0 | Overlay cue engine | 006,009 | cue timed and retractable |
| MQ-011 | P0 | Live studio and analyst UI | 006,010 | evidence drawer functional |
| MQ-012 | P0 | Fan/analyst localization | 009,011 | same facts across modes |
| MQ-013 | P0 | Automated recap | 005,009 | fact verification + export |
| MQ-014 | P0 | Azure deployment + telemetry | 001,006 | public demo and health check |
| MQ-015 | P0 | Demo recording + submission | 010–014 | public video <120 sec, repo public |
| MQ-016 | P1 | Player focus and metrics availability | 005,011 | no invented tracking metrics |
| MQ-017 | P1 | Producer approval and retraction | 010 | audited state transitions |
| MQ-018 | P1 | Agent trace UI | 009 | shows trace without secrets |
| MQ-019 | P2 | Enterprise tenant auth + RLS | 004 | cross-tenant test suite passes |
| MQ-020 | P2 | Licensed provider adapter | 019 | contract and provenance review |
| MQ-021 | P2 | Billing/metering | 019 | reconciled immutable ledger |
| MQ-022 | P2 | DR/production hardening | 019,020 | restore drill, SLO burn-in |

**Agent execution order:** implement vertical slice MQ-001→015; do not start P2 before working public demo. One PR per cohesive story; record assumptions and screenshots in `/docs/implementation-log.md`; block merging if tests fail. If only 48 hours remain, prioritize MQ-003/005/009/010/011/014/015 and simplify metrics rather than fabricating results.

## 54. Hackathon sprint, demo proof and submission artifacts

**Dates:** Oct 20 registration/profile/project listing confirmed by user; submit by Oct 27, 2026 23:59 PDT = Oct 28 07:59 WAT. Target internal freeze Oct 27 12:00 WAT (19h59m buffer), final submission Oct 27 18:00 WAT. Avoid assuming platform availability near deadline.

**Day plan:** Oct 20 repo/schema/fixture; Oct 21 generator/ingest/metrics; Oct 22 real-time state/UI; Oct 23 agents/verifier; Oct 24 overlays/personas/recap; Oct 25 Azure deployment/tests; Oct 26 demo capture, rights scan, accessibility, load smoke; Oct 27 final QA and early submit. Reassess each day using objective P0 evidence.

**110-second storyboard:** 0–12s problem and product; 12–30s synthetic match live feed and tactical stats; 30–52s key moment with evidence; 52–70s multi-agent trace and verification/fallback; 70–88s overlay and analyst vs fan/locale; 88–101s Azure/Foundry architecture and repo; 101–110s measurable value and callout. Record actual functioning application, not Figma mockups; use original assets or licensed material only.

**Submission package:** project title/tagline, honest feature inventory, public repository with MIT/other reviewed license, setup/runbook, architecture diagram, Azure services evidence, reproducible seed, test report, public demo URL, sub-2-minute public video, licensing statement, contact and access instructions. Validate links in logged-out browser. Do not claim unimplemented features or fabricated benchmarks.

## 55. Commercial pilot program and enterprise acceptance criteria

**Pilot prerequisites:** signed evaluation agreement, authorized data license, security questionnaire, DPA as applicable, agreed fixture count and concurrency, named producer, data-provider escalation, incident contacts, baseline workflow metrics.

**30–60 day pilot phases:** discovery/baseline → integration and dry run → supervised live or replay operation → measurement and editorial review → commercial decision. Metrics: median time to verified cue, false claim rate, cue acceptance %, producer overrides, P95 end-to-end delay, uptime, cost per fixture, user satisfaction and engagement where consented. Compare to incumbent workflow; report confidence and limitations.

**Go/no-go thresholds (proposed):** zero critical data-rights or security findings; no unsupported published numerical claim in acceptance suite; 95%+ producer acceptance of eligible cues in supervised pilot (target, not claim); latency within negotiated budget; customer signs off operational procedures. Customer contract must specify ownership of derived outputs, content review responsibility, retention and exit/export rights.

## 56. Architecture decision records and assumptions to resolve

**ADR-001:** TypeScript-first monorepo to reduce delivery time; revisit Python for CV/ML only when required. **ADR-002:** deterministic football engine precedes LLM. **ADR-003:** SSE for viewer streaming, queue for durable async jobs. **ADR-004:** PostgreSQL for MVP authoritative event store, optional Fabric analytical sink. **ADR-005:** Foundry adapter with mock/fallback to prevent quota-related demo failure. **ADR-006:** synthetic-only public demo, no copyrighted broadcast footage. **ADR-007:** publication approval configurable by tenant, auto-publish only verified low-risk content. **ADR-008:** provider-neutral canonical event schema with capability flags.

**Unresolved and owner-assigned:** Foundry quota/region (cloud owner); exact judging submission form (project owner); permitted use of league naming/assets (legal); real data provider and licensing costs (commercial owner); target customer geography/privacy regime (product/legal); SLO feasibility (SRE after benchmarks); model multilingual performance (AI evaluation owner). Each item needs due date, decision, evidence URL and impact.

**Source of truth hierarchy:** official organizer rules and challenge page > signed customer/provider contracts > tested implementation behavior > this design baseline > unverified assumptions. Do not treat planned services or features as deployed.

## 57. Developer-agent execution prompt and guardrails

**Agent kickoff instruction:** 'Read this entire specification, especially sections 38–56 and official hackathon constraints. First inspect repository and report current state. Produce a dependency-ordered implementation plan for MQ-001–015. Implement one ticket at a time, include tests and acceptance evidence, and never invent credentials, provider access, Azure quotas, metrics, benchmark results, or completion status. Ask before irreversible cloud expenditure, public deployment, or licensing decisions. Prefer deterministic pure football computations and typed contracts. Keep a running implementation log and update architecture decision records. After each ticket, report files changed, commands run, test results, known limitations, and next dependency.'

**Non-negotiable code conventions:** TypeScript strict, Zod boundary validation, no `any` without documented exception, typed errors, UTC internally, explicit units, no client-trusted tenant IDs, no secrets in source, semantic migrations, deterministic seedable tests, accessible UI, stable event IDs, versioned API/metrics/prompt contracts.

**Agent review checklist:** actual file diff inspected; tests genuinely executed; no placeholder business logic presented as implemented; no fake statistics; licensed content absent; no unauthorized network/API calls; secrets masked; costs bounded; docs and deployment scripts consistent with implementation.

## 58. Document control, traceability and maintenance

**Document ID:** MQ-ENT-SPEC-003. **Baseline:** 2026-10-20. **Owner:** MatchIQ product/engineering lead. **Status:** design baseline, not evidence of implementation or compliance. **Change process:** each change request references affected requirement IDs, schema version, migration, tests, release notes and rollback. Maintain `/docs/requirements-traceability.csv` with requirement→story→code→test→demo evidence.

**Suggested repository documents:** `/docs/prd.md`, `/docs/brd.md`, `/docs/architecture.md`, `/docs/domain-data-dictionary.md`, `/docs/api/openapi.yaml`, `/docs/events/schema/`, `/docs/agent-evaluation.md`, `/docs/security-threat-model.md`, `/docs/operations/runbooks/`, `/docs/business/pricing-hypotheses.md`, `/docs/ux/screen-specs.md`, `/docs/adr/`, `/docs/hackathon/submission-checklist.md`. This master specification is a baseline, not a substitute for executable schemas and tests.

**Evidence labeling:** [OFFICIAL] organizer-supplied; [DESIGN] proposed architecture; [TARGET] unmeasured acceptance objective; [VALIDATED] measured/tested with linked artifacts; [ASSUMPTION] requires confirmation. Any external presentation must distinguish these labels.

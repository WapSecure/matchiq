# ADR-0042: Recorded model provider

- Status: Accepted (2026-10-25). Extends ADR-0012 (local-first AI providers). Honours ADR-0003 and ADR-0007 (no unexercised integration is claimed). Recorded by MQ-100.

## Context

Judges run MatchIQ on their own machines. Most have no Ollama and no strong GPU, so they see only standard wording and the multi-agent story (writer, fact checker, translator, graphics writer) disappears. On the owner's laptop the model was also too slow at replay speed: 0 of 41 moments were model-written in the last two matches.

## Decision

Add a fourth provider, `MODEL_PROVIDER=recorded`, that replays **real model output captured in an earlier run** through the unchanged pipeline.

- **What is recorded.** A committed JSON file per match template (`apps/agents/src/matchiq_agents/providers/recordings/fx_comeback_42.json`) holds, per moment: the agent-written narratives per persona and locale, the overlay copy and the agent runs (latency, tokens, outcome, retries) of a real `qwen2.5:7b-instruct` run on 23 October 2026 (session `fx_comeback_42_s7`, 19 moments). `apps/agents/scripts/export_recording.py` rebuilds it from a local database with SELECT statements only.
- **How a moment is matched.** Insight ids differ per session, so a moment is keyed by facts that are stable across sessions of one template: template id (the fixture id without its `_sN` session suffix), insight kind, period, match clock in milliseconds, subject side (home, away or none) and reason code.
- **What is replayed and what is live.** Only the model calls are replaced. The Fact Checker (`verify`), the template fallback, the per-item translation checks (`check_localised`), the overlay checks (`check_overlay`), the step recorder, the result builder and the worker's deterministic publish gate all run on recorded text exactly as on live text. A recorded draft whose numbers or wording no longer pass is rejected and the template airs, with the usual reason.
- **Pause.** `RECORDED_LATENCY_MS` (default 1500, 0 allowed) delays a hit so the studio shows the template first and the model copy arriving. Recorded run and step latencies are reported as recorded.
- **Misses.** A moment with no recording gets the ordinary template-only result, status `FALLBACK`, reason "no recording for this moment". Moments the worker never sends to the agents (player milestones, ADR-0011 addendum 7) are not recorded.
- **Defaults unchanged.** `mock`, `ollama` and `foundry` behave as before. `recorded` is refused when `APP_ENV=prod`, like `mock`, and the service fails to start if its recordings are missing or invalid.

## The honesty rule

A replay must never read as a live model.

- The run provider is `recorded` (a new value of the `ModelProvider` contract enum; the generated Python, JSON Schema and OpenAPI are regenerated). The deployment is `recorded/qwen2.5:7b-instruct`.
- The Fact-checks page and Observatory name it "Recorded model run" with the line "Wording written by a model in an earlier run and replayed through today's checks", never "AI (local model)".
- Docs, README and submission text call it a replay of earlier real output, only for the Late comeback scenario, for machines without a model. Nothing here claims Foundry, Azure or a live model.
- The readiness check reports `recorded` as degraded with "no live model".

## What the source session lacked

`fx_comeback_42_s7` is older than agent steps and cited values, so these were not stored:

- **Cited values** (metric reference and value per draft). They are rebuilt at export from the draft text and the moment's engine metrics: each digit in the text is matched to one metric that equals it, preferring the metrics the overlay named. The checks then judge them, so a draft that states a number the engine does not support still fails. Non-English locales copy the English draft's citations, as the live pipeline does.
- **Agent steps.** The replay produces fresh steps through the live step recorder, with the recorded run latencies.
- **Analyst claims.** Not stored, so `analysis` is empty on a replay.

## Consequences

- Judges see agent-written cards, the Observatory and the gate on any laptop, with no installation.
- **Today's checks reject part of the old wording.** The 7B run predates the current editorial rules. On a fresh Late comeback session all 19 agent-bound moments match; 9 moments are published with the model's wording for every audience, 1 partly, and 9 fall back to templates because the goal and momentum drafts no longer pass (goal must lead with the score and name the scorer; momentum headlines must match the direction). The gate is correct to reject them. A newer recording would raise the share.
- Recorded wording describes the s7 numbers. Because the engine is deterministic for a seeded template, they match fresh sessions of the same template; any drift is rejected by the gate.
- One more contract enum value; web gets one label and one note.
- Only the Late comeback template is recorded. Other scenarios show standard wording and the Fact-checks page says why.
- Not claimed: this is not a live model, not an integration test of Ollama or Foundry, and not evidence that any Microsoft service works.

## Alternatives rejected

- Replaying through a fake `ModelPort`: the agents' raw outputs (claims, cited values) were not stored, so the roster would have had to be fed invented inputs.
- Matching by insight id: ids differ per session, so nothing would match.
- Bypassing the gate for recorded text: it would hide exactly the behaviour a judge should see.

## Addendum (2026-10-27): valid output and demo faults (MQ-119)

- The replay's responses were refused by the worker because a rebuilt draft carried `breakdown: null`; the HTTP body now omits empty optional fields for every provider. Measured on the committed recording against the 19 real Late comeback packets: 9 moments publish with the recorded wording for every audience, 1 partly, 9 fall back (stale goal and momentum wording, correctly rejected).
- Demo faults apply to a replay when `DEMO_FAULTS_ENABLED` is on. `WRITER_REVISE` corrupts one recorded draft with the `fault.injected` citation, the live Fact Checker returns REVISE, and the revision restores the recorded draft (no number in a recording is edited, no model call is claimed). `MODEL_TIMEOUT` runs the isolated faulted pipeline, which airs templates; its runs are labelled `mock` and TIMED_OUT because nothing was replayed.

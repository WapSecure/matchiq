# Agent evaluation methodology

How MatchIQ measures whether its agents write grounded narratives, and how prompt changes are gated. Spec §33, §46 and §52; governance rules in `docs/engineering/AI_AGENT_GOVERNANCE.md`.

## What is measured

| Measure              | Definition                                                                                                                                                                                                            | Target                       |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| Grounding violations | Counted by the independent oracle in `apps/agents/tests/eval/harness.py`: numbers that match no engine value, unknown capitalised names, injection markers, uncited drafts, wrong cited values, locale number changes | **0, always**                |
| Agent share          | Narratives whose `source` is `AGENT` (and not `localeFallback`) divided by all narratives returned                                                                                                                    | as high as possible          |
| Status               | `VERIFIED` (everything from agents and verified) or `FALLBACK` (at least one stage used a template)                                                                                                                   | —                            |
| Latency              | Wall time per insight, p50 and p95, plus per-agent latency by outcome                                                                                                                                                 | inside `deadlineMs`          |
| Model calls          | Requests sent to the model per insight, retries included                                                                                                                                                              | —                            |
| Failure taxonomy     | Every rejected model output, by stage, rule, persona and locale (below)                                                                                                                                               | shrinking                    |
| Load average         | `os.getloadavg()` at the start and end of a run                                                                                                                                                                       | recorded with every live run |

The oracle deliberately shares no code with the Fact Checker (`guard/`). An evaluation that reused the checker would only prove the checker agrees with itself.

Mock and template output are never counted as agent output. A narrative served in en-GB because its translation failed (`localeFallback`) is reported separately from both.

## Cases

- **Golden** (`tests/eval/cases.py`, 42 cases): every insight kind, sparse and rich evidence, decimals, negative and zero values, accented, apostrophe and hyphenated names, every locale including Nigerian Pidgin, persona subsets, a tight deadline, and `real_packet_shape` (28 metrics over two windows and 38 allowlisted names, the shape the worker sends for a real fixture). Four editorial cases use the real two-window shape: `goal_real_shape` (the 3–2 winner, scorer named), `goal_equaliser_away`, `red_card_real_shape` and `momentum_real_shape` (two negative momentum indices).
- **Adversarial inputs** (8 cases): prompt injection in player and team names, rationale and counter-evidence (English and Pidgin), a forged data delimiter and a digit in a name.
- **Compromised-model attacks** (`tests/eval/attacks.py`, 13 scripted outputs): what a model that ignores its instructions would return. They run in CI against the real checks.

A live run uses `--cases 12` (an evenly spaced, deterministic sample of the 50) plus `--case real_packet_shape`, or the full set. That is 13 cases. The committed baseline (`ollama-qwen2.5-7b-instruct.json`) holds the 12 cases of the MQ-068 run (implementation log). A new baseline recorded with the command below will have its own case count; the CI check reads the baseline file, not this document.

The "28% to 87% fully localised" figure compares the run before and after commit `4d977d6` (PR #40). Only the after run is committed as a baseline; the before figure is historical, recorded in the implementation log, and has no artifact in the repository.

## Failure taxonomy

Each rejection is logged once per issue by `pipeline/diagnostics.py` as a structured `output_rejected` record (logger `matchiq_agents.rejections`): run id, agent (stage), rule, persona, locale, attempt and a text snippet. The eval script collects these records; operators can read the same records from the service logs.

Rules are finer than the contract's issue codes:

| Rule                                                     | Meaning                                                                                                                                                                     |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TIMEOUT`, `TRANSPORT`, `UNPARSEABLE`                    | The call itself failed: deadline, connection, or output that is not the requested JSON                                                                                      |
| `CONTRACT_INVALID`                                       | The JSON parsed but broke the contract (for example a 90-character headline); per persona where known                                                                       |
| `UNSUPPORTED_NUMERAL`, `WINDOW_LENGTH`                   | A number that is no cited engine value; `WINDOW_LENGTH` when it is a time window ("last 10 minutes")                                                                        |
| `SPELLED_NUMBER`, `WRONG_VALUE`, `UNKNOWN_METRIC`        | A number written as a word, a cited value that differs from the engine, or a ref the engine never made                                                                      |
| `SPELLED_COUNT`                                          | A short word that is no quantifier written as the count before "times" ("twi times")                                                                                        |
| `MISSING_ITEM`                                           | A required (locale, persona) item the Localization output left out                                                                                                          |
| `UNKNOWN_NAME`, `UNCITED`, `UNKNOWN_EVENT`               | Names outside the allowlist; missing or foreign evidence ids                                                                                                                |
| `TOO_LONG`, `TOO_MANY_SENTENCES`, `MISSING_PERSONA`      | Persona limits and missing drafts                                                                                                                                           |
| `FORBIDDEN`, `UNSAFE_CONTENT`                            | Forbidden claims (medical, betting, prediction, managerial intent, injection) and the safety blocklist                                                                      |
| `NUMERALS_CHANGED`, `NAME_DROPPED`                       | A translation that changed a number or dropped a proper noun                                                                                                                |
| `EVENT_NOT_LEAD`, `OFF_TOPIC_HEADLINE`, `SECONDARY_STAT` | Editorial: a goal or red-card headline that does not lead with the event, a headline without the subject and its event, a goal headline with a number that is not the score |
| `MISSING_SCORELINE`, `GOAL_TALLY`, `MISSING_PLAYER`      | Editorial: a goal without the score after it, a goal told as a count ("2 goals"), a scorer or dismissed player the evidence names but the text leaves out                   |
| `WRONG_DIRECTION`, `RAW_INDEX`, `UNLABELLED_INDEX`       | Editorial: a rising moment told as a fall, an internal index value shown to Fan or Broadcast, an Analyst index value without its label                                      |

`WINDOW_LENGTH` is split out of `UNSUPPORTED_NUMERAL` by the eval (`tests/eval/taxonomy.py`) from the snippet around the number.

## Worker publish gate checks

The worker gate re-checks every agent draft and overlay on its own (spec §10, §28, §46), so a Fact Checker bug cannot publish text. The rules live in `libs/narrative-guard` (pure TypeScript), and each failure is a `GateIssueCode` on the insight's gate report:

| Code                    | Fires on                                                                                                                                                                           |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FORBIDDEN_CLAIM`       | The shared lexicon: medical or injury speculation, betting and odds, predictions stated as fact, managerial intent                                                                 |
| `INJECTION_ECHO`        | Echoed instructions ("ignore previous instructions", FR/ES/PCM forms), prompt leakage ("system prompt", "as an AI"), data delimiters, links and markup                             |
| `UNSUPPORTED_CAUSALITY` | A causal connective ("because", "led to", "thanks to", "parce que", "grâce à", "porque", "gracias a", "bikos", "na im make") in a sentence with no cited value and no named event  |
| `REPETITION`            | A 4-token phrase repeated within the headline or body, or an agent draft with token Jaccard ≥ 0.8 against a narrative for the same persona and locale in the last 10 match minutes |
| `UNSAFE_TONE`           | Blocklisted profanity, slurs or abuse; two or more consecutive all-caps words, or a field that is 70% capitals; more than one "!" in a field, or "!!" and "?!"                     |

- **Shared lexicon.** The forbidden and safety patterns are defined once in `libs/narrative-guard/src/lib/lexicon.ts`. `pnpm codegen` exports them to `libs/narrative-guard/generated/narrative-lexicon.json` and copies that file into the Python package, where `guard/lexicon.py` loads it. Drift tests on both sides, and CI's codegen diff, fail if the copies differ.
- **Reject, not repair.** A causal clause is never cut out: removing it can change what the sentence claims, and the template for that variant is always available. Templates are exempt only from the recent-narrative check, because their deterministic wording repeats by design.
- **False-positive guards.** Table-driven tests cover all four locales, including causal sentences that cite a metric or name an event, ordinary pressing and possession prose, Pidgin reduplication ("well well") and Pidgin "pass" meaning "more than". Every golden template variant and overlay must still pass the gate.

## Analyst breakdown (MQ-068)

An ANALYST narrative may carry `breakdown`: what happened, why it matters, what to watch. The deterministic templates write it in every locale, so the live model does not affect it. Checks:

- Each part is held to the body's rules: cited values equal the evidence metrics or the insight's `context.metrics`, every numeral is a cited value, evidence ids come from the envelope or `context.eventIds`, names are allowlisted, and the forbidden-claim, safety, betting and prediction rules pass. Spelled-out numbers are flagged in every locale.
- Editorial rules for the parts (`guard/editorial_breakdown.py`): an internal index is shown only with its label, each metric is cited in one part only, "what to watch" has no number and is never a prediction, and a rising moment is never described as falling.
- The independent oracle (`tests/eval/harness.py`) accepts context metrics as support and checks the parts again without importing the guard.
- Tests: `tests/test_breakdown.py` covers every moment type and locale (three parts present, 360 characters at most, every numeral cited, no number words), packets without context, and the editorial rules. The worker has the same coverage for its TypeScript templates.

The model writes no breakdown part. The Analyst (2.2.0) may state one context value in a claim and the Writer (3.1.0) may carry it into the Analyst body, so the prompts changed and the baseline was re-recorded (below).

## Running an evaluation

From `apps/agents`:

```bash
uv run python scripts/run_eval.py --provider mock                       # CI-equivalent, seconds
uv run python scripts/run_eval.py --provider ollama --deadline-ms 120000 \
  --cases 12 --case real_packet_shape --verbose \
  --json /tmp/eval.json --baseline tests/eval/baselines/ollama-qwen2.5-7b-instruct.json
```

- Each case gets a fresh circuit breaker, so one slow case cannot fail the rest fast. The service itself shares one breaker across requests.
- Ollama runs one request at a time. Another client on the same server (a demo stack, another evaluation) queues ahead of the evaluation and inflates its latency. Record the load average and say so; do not compare latency across runs with very different load.
- `ollama` and `foundry` runs are never part of CI. They make real model calls and depend on the machine.

## Prompt versioning and the CI gate

- Every prompt has a SemVer `version` and a SHA-256 `content_hash` of its instructions, the user task and the data framing (`roster/prompts.py`). Each `AgentRun` records both (`promptVersion`, `promptHash`), so a trace names the exact text that produced it.
- `roster/prompt_registry.json` is append-only: every (agent, version) maps to one hash. `scripts/prompt_registry.py --record` appends the current prompts and refuses to reuse a version for different text.
- `tests/test_prompt_registry.py` runs in CI and fails when:
  1. a prompt's (version, hash) is not in the registry (text changed without a version bump, or the bump was not recorded); or
  2. the checked-in live baseline (`tests/eval/baselines/ollama-qwen2.5-7b-instruct.json`) was recorded against different prompts, or shows any violation.
- So a prompt change ships only with a fresh offline Ollama evaluation, recorded with `--baseline` and reviewed in the PR. The mock evaluation (`tests/eval/test_golden.py`) still runs every case in CI.

**Baseline re-recorded for MQ-068 (2026-10-23).** The prompt registry gate requires a baseline recorded against the current prompts, and Analyst 2.1.0 to 2.2.0 and Writer 3.0.0 to 3.1.0 changed them. Live run on `ollama/qwen2.5:7b-instruct` at a 120 s deadline: 12 cases, 0 violations, 73% agent share (84 of 115 narratives), 40 successful and 2 timed-out model calls, with a load average of 6 to 13. The earlier baseline had 3% agent share under a load of 26 to 35, so the two shares are not a like-for-like comparison.

## Repairs, retries and what may never change

- Deterministic repairs (`guard/repair.py`) may delete trailing sentences to meet a persona's sentence or length limit, and replace a time-window phrase ("in the last 10 minutes") with "recently" when the number is the window of an engine metric and not a cited value. The overlay may gain the ref of a number its approved draft cited. Editorial repairs (`guard/editorial_repair.py`, ADR-0011 addendum 3) may replace an off-topic goal or red-card headline with the engine's event line, put the engine's scorer sentence first where the persona has room, and delete a Fan or Broadcast sentence that shows an internal index. Every repair is recorded on the run's `AgentRun.repairs`, and the checks run on the repaired text.
- A rejected Analyst or Producer answer gets one retry with the violations and their fix fed back (`revisionNotes`), only while 60% of the deadline is left. The Writer's revision loop already feeds the Fact Checker's notes back.
- No grounding rule is loosened to raise the agent share. Every change must keep zero violations on the oracle across mock, scripted attacks and live runs.

## Cost

`AgentRun.costEstimateUsd` comes from `AGENT_PRICE_TABLE` (USD per million input and output tokens per deployment). Local inference and the mock record 0. A cloud deployment without a configured price records no estimate rather than a misleading 0.

## Handoff records

Each run also returns one `AgentStep` per roster stage (ADR-0011 addendum 4). For evaluation they give, per stage, the decision and reason code, the evidence cited and the usage. `inputChecksum` is deterministic for a given request and model output, so two runs of a case can be compared stage by stage: the first differing checksum shows where they diverged. A step with reason code `BUDGET_EXCEEDED` means the per-run budget, not the model, ended the stage; such runs are reported separately and are not counted as model failures.

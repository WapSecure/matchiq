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

- **Golden** (`tests/eval/cases.py`, 38 cases): every insight kind, sparse and rich evidence, decimals, negative and zero values, accented, apostrophe and hyphenated names, every locale including Nigerian Pidgin, persona subsets, a tight deadline, and `real_packet_shape` (28 metrics over two windows and 38 allowlisted names, the shape the worker sends for a real fixture).
- **Adversarial inputs** (8 cases): prompt injection in player and team names, rationale and counter-evidence (English and Pidgin), a forged data delimiter and a digit in a name.
- **Compromised-model attacks** (`tests/eval/attacks.py`, 10 scripted outputs): what a model that ignores its instructions would return. They run in CI against the real checks.

A live run uses `--cases 12` (an evenly spaced, deterministic sample of the 46) plus `--case real_packet_shape`, or the full set.

## Failure taxonomy

Each rejection is logged once per issue by `pipeline/diagnostics.py` as a structured `output_rejected` record (logger `matchiq_agents.rejections`): run id, agent (stage), rule, persona, locale, attempt and a text snippet. The eval script collects these records; operators can read the same records from the service logs.

Rules are finer than the contract's issue codes:

| Rule                                                | Meaning                                                                                                |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `TIMEOUT`, `TRANSPORT`, `UNPARSEABLE`               | The call itself failed: deadline, connection, or output that is not the requested JSON                 |
| `CONTRACT_INVALID`                                  | The JSON parsed but broke the contract (for example a 90-character headline); per persona where known  |
| `UNSUPPORTED_NUMERAL`, `WINDOW_LENGTH`              | A number that is no cited engine value; `WINDOW_LENGTH` when it is a time window ("last 10 minutes")   |
| `SPELLED_NUMBER`, `WRONG_VALUE`, `UNKNOWN_METRIC`   | A number written as a word, a cited value that differs from the engine, or a ref the engine never made |
| `UNKNOWN_NAME`, `UNCITED`, `UNKNOWN_EVENT`          | Names outside the allowlist; missing or foreign evidence ids                                           |
| `TOO_LONG`, `TOO_MANY_SENTENCES`, `MISSING_PERSONA` | Persona limits and missing drafts                                                                      |
| `FORBIDDEN`, `UNSAFE_CONTENT`                       | Forbidden claims (medical, betting, prediction, managerial intent, injection) and the safety blocklist |
| `NUMERALS_CHANGED`, `NAME_DROPPED`                  | A translation that changed a number or dropped a proper noun                                           |

`WINDOW_LENGTH` is split out of `UNSUPPORTED_NUMERAL` by the eval (`tests/eval/taxonomy.py`) from the snippet around the number.

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

## Repairs, retries and what may never change

- Deterministic repairs (`guard/repair.py`) may delete trailing sentences to meet a persona's sentence or length limit, and replace a time-window phrase ("in the last 10 minutes") with "recently" when the number is the window of an engine metric and not a cited value. The overlay may gain the ref of a number its approved draft cited. Every repair is recorded on the run's `AgentRun.repairs`, and the checks run on the repaired text.
- A rejected Analyst or Producer answer gets one retry with the violations and their fix fed back (`revisionNotes`), only while 60% of the deadline is left. The Writer's revision loop already feeds the Fact Checker's notes back.
- No grounding rule is loosened to raise the agent share. Every change must keep zero violations on the oracle across mock, scripted attacks and live runs.

## Cost

`AgentRun.costEstimateUsd` comes from `AGENT_PRICE_TABLE` (USD per million input and output tokens per deployment). Local inference and the mock record 0. A cloud deployment without a configured price records no estimate rather than a misleading 0.

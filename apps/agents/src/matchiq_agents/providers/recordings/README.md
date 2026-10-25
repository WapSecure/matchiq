# Recorded model runs

Real model output captured earlier, replayed by `MODEL_PROVIDER=recorded` ([ADR-0042](../../../../../../docs/adr/0042-recorded-model-provider.md)). No model runs when these are used, and the product labels the runs "Recorded model run".

## `fx_comeback_42.json`

| Field             | Value                                                                         |
| ----------------- | ----------------------------------------------------------------------------- |
| Template          | `fx_comeback_42` (Late comeback, synthetic)                                   |
| Source session    | `fx_comeback_42_s7`                                                           |
| Model as recorded | `qwen2.5:7b-instruct` through Ollama, on a laptop                             |
| Recorded on       | 2026-10-23 (the dates in the `agent_runs` rows of that session)               |
| Moments           | 19 (every moment the worker sends to the agents; player milestones never are) |

Each moment holds the agent-written narratives per persona and locale, the overlay copy and the runs (latency, tokens, outcome, retries). Tenant ids, insight ids, narrative ids and timestamps are not included.

## How it was exported

```bash
cd apps/agents
uv run python scripts/export_recording.py --session fx_comeback_42_s7 \
  --out src/matchiq_agents/providers/recordings/fx_comeback_42.json
```

The script reads a local Postgres through `docker exec matchiq-postgres-1 psql` with SELECT statements only and is deterministic: the same session gives the same file. It validates the result against the loader's schema before writing. Run `pnpm exec prettier --write` on the file afterwards so the format check passes; that changes layout only.

Cited values were not stored by that session. The script rebuilds them from the draft text and the moment's engine metrics (each digit matched to one metric that equals it). The live checks then judge them.

## Matching

A moment is keyed by template id, insight kind, period, match clock (ms), subject side and reason code. Insight ids differ per session and are never used.

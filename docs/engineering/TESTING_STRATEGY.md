# Testing Strategy

## Runners

| Scope                    | Runner                          | Command                  |
| ------------------------ | ------------------------------- | ------------------------ |
| TS libraries, web        | Vitest                          | `pnpm nx test <project>` |
| Nest apps and server-kit | Jest + SWC (decorator metadata) | `pnpm nx test api`       |
| Agents                   | pytest                          | `pnpm nx test agents`    |
| E2E + accessibility      | Playwright + axe-core           | `pnpm e2e`               |

To run a single test:

- Vitest: `pnpm nx test contracts -- -t "rejects unknown event types"`
- Jest: `pnpm nx test api -- -t "liveness"`
- pytest: `cd apps/agents && uv run pytest tests/test_health.py -k ready`
- Playwright: `pnpm nx e2e web-e2e -- --grep "skip link"`

## Layers and required coverage

| Layer                         | What must be proven                                                                                                                                                                                           | Introduced    |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| Unit                          | Metric maths (including null denominators), clock and period handling, rules, state machines                                                                                                                  | M0 onwards    |
| Property-based (`fast-check`) | Generator invariants: monotonic clock per period, scores change only on `GOAL`, valid player-team links                                                                                                       | M1            |
| Golden replay                 | Same seed gives the same event hash. Replays at 1× and 30× give identical snapshot hashes and cue sequences                                                                                                   | M1            |
| Contract                      | Zod ↔ JSON Schema ↔ Pydantic parity using shared samples. Generated code has no drift                                                                                                                         | M0            |
| Integration (Testcontainers)  | Idempotent ingest (duplicate gives no-op, changed body gives 409), outbox delivery, SSE resume via `Last-Event-ID`                                                                                            | M1            |
| AI evaluation                 | Zero unsupported numeric claims, entity allowlist, prompt-injection strings in event metadata, fallback when the model is disabled. Prompt registry gate and recorded live baseline (`docs/ai/EVALUATION.md`) | M2            |
| E2E                           | Judge quick-start flow, persona and locale switch with unchanged numbers, mobile viewport                                                                                                                     | M0 shell → M3 |
| Accessibility                 | axe with no serious or critical WCAG 2.2 AA violations, keyboard skip link, reduced motion                                                                                                                    | M0 onwards    |
| Failure                       | Model outage, duplicate or late events, worker restart without duplicate publication                                                                                                                          | M2–M4         |

## Rules

- A feature is not complete while any required test fails. Tests are never skipped to make CI pass.
- Test behaviour through public interfaces. Avoid asserting on private implementation details.
- Tests are deterministic: inject the clock and seed, and make no network calls. Foundry is exercised only by `scripts/foundry_probe.py` and the gated AI evaluation suite.
- Every bug fix includes a regression test.
- Coverage is reported per project (`test-output/*/coverage`). Critical-path correctness matters more than the percentage.

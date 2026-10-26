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

| Layer                               | What must be proven                                                                                                                                                                                                                                                                                                                                        | Introduced    |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| Unit                                | Metric maths (including null denominators), clock and period handling, rules, state machines                                                                                                                                                                                                                                                               | M0 onwards    |
| Property-based (`fast-check`)       | Generator invariants: monotonic clock per period, scores change only on `GOAL`, valid player-team links                                                                                                                                                                                                                                                    | M1            |
| Golden replay                       | Same seed gives the same event hash (`libs/synthetic-data/tests/golden.spec.ts`). Golden fixtures pin the engine `stateHash` (`libs/football-engine/tests/golden.spec.ts`). Replays at 1× and 30× are compared by emitted event sequence (`libs/replay/tests/replay-controller.spec.ts`); snapshot hashes and cue sequences are not compared across speeds | M1            |
| Contract                            | Zod ↔ JSON Schema ↔ Pydantic parity using shared samples. Generated code has no drift                                                                                                                                                                                                                                                                      | M0            |
| Integration (CI service containers) | Idempotent ingest (duplicate gives no-op, changed body gives 409), outbox delivery, SSE resume via `Last-Event-ID`                                                                                                                                                                                                                                         | M1            |
| AI evaluation                       | Zero unsupported numeric claims, entity allowlist, prompt-injection strings in event metadata, fallback when the model is disabled. Prompt registry gate and recorded live baseline (`docs/ai/EVALUATION.md`)                                                                                                                                              | M2            |
| E2E                                 | Judge quick-start flow, persona and locale switch with unchanged numbers, mobile viewport                                                                                                                                                                                                                                                                  | M0 shell → M3 |
| Accessibility                       | axe with no serious or critical WCAG 2.2 AA violations, keyboard skip link, reduced motion                                                                                                                                                                                                                                                                 | M0 onwards    |
| Failure                             | Model outage, duplicate or late events, worker restart without duplicate publication                                                                                                                                                                                                                                                                       | M2–M4         |

## Browser smoke on the Compose stack

`apps/web-e2e/src/fullstack-smoke.spec.ts` drives the real web UI against the real stack with no mocks and no route interception. The CI job "Browser smoke on the Compose stack" boots `docker compose --profile app up` from fresh volumes, then the spec starts the "Late comeback" replay at the fastest speed (30×), waits for "Full time", and checks the scoreboard, a key moment with its Evidence drawer, the Match stats rows "Shot conversion" and "Pass quality", the Recap match story and final stats, the Fact-checks summary, and the signed-out "You don't have access to this" message on the Activity log. Axe runs on the lobby, studio and recap pages. It proves a clean run through a browser, which the HTTP-only "Compose stack and replay smoke" does not.

Run it locally against a stack that is already up (the spec skips itself without `BASE_URL`, so the mocked e2e suite is unaffected):

```bash
cd apps/web-e2e && BASE_URL=http://localhost:4200 pnpm exec playwright test fullstack-smoke --project=desktop-dark --retries=0
```

The job is `continue-on-error`: a failure shows red but does not block merges, and it is not in the required checks or the final gate. It becomes a required check only after it has passed cleanly on several consecutive dev runs.

## Rules

- A feature is not complete while any required test fails. Tests are never skipped to make CI pass.
- Test behaviour through public interfaces. Avoid asserting on private implementation details.
- Tests are deterministic: inject the clock and seed, and make no network calls. Foundry is exercised only by `scripts/foundry_probe.py` and the gated AI evaluation suite.
- Every bug fix includes a regression test.
- Coverage is reported per project (`test-output/*/coverage`). Critical-path correctness matters more than the percentage.

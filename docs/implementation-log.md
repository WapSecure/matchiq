# Implementation Log

Newest entries first. Each entry records what was delivered, the evidence, and what remains. Status labels: **Done**, **Partial**, **Blocked**.

## 2026-10-22 — MQ-022: Honest session capacity, idempotent replay commands and data retention

Fixes audit items P0-2 and P0-3. Decision record: ADR-0015. Policy: `docs/operations/DATA_RETENTION.md`.

| Area                                                                                                                                                                                                                                                                          | Status | Evidence                                                                                                                                                                                                                                                    |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TRUST_PROXY` (validated: false, hop count ≤ 10, or IP/CIDR/named-range list; `true` rejected) applied by `configureHttpApp`. Set to `1` in the VPS overlay behind Caddy                                                                                                      | Done   | `operations-env.spec.ts`; `trust-proxy.spec.ts` (server-kit); `trust-proxy.integration.spec.ts` (api): two forwarded clients get separate replay buckets, a spoofed left-most address does not, and with it off they share one                              |
| Capacity: only `PLAYING` and freshly created `IDLE` sessions (within `REPLAY_IDLE_TIMEOUT_MS`) hold a slot. The API checks before create (under an advisory lock) and on start/resume, and answers `503 replay-capacity` with `Retry-After: 30`; nothing is created or queued | Done   | `replay-capacity.integration.spec.ts`: 503 at the cap with no new rows; pause, completion, idle ageing and a stale PLAYING row free the slot; a session never counts against itself                                                                         |
| Worker backstop: a start/resume over the cap is not applied; it writes the real `replay.status` and a `replay.command.rejected` audit row instead of a log line                                                                                                               | Done   | `session-capacity.integration.spec.ts` "refuses a start at capacity…"                                                                                                                                                                                       |
| Idle eviction: non-playing runners untouched for the idle timeout leave memory and reload from the ledger (speed restored) on the next command                                                                                                                                | Done   | Two abandoned sessions free their slots; after eviction one resumes and completes with a contiguous ledger; a loaded IDLE session stops counting after the timeout                                                                                          |
| Restart: only `PLAYING` sessions resume, up to the cap; the rest are paused durably; `PAUSED` sessions are not loaded                                                                                                                                                         | Done   | "resumes only up to the limit after a restart…" (3 sessions, cap 1 after restart → 1 PLAYING, active count 1)                                                                                                                                               |
| `Idempotency-Key` on `POST …/sessions` and `POST …/replay`: same key and body replays the stored response (`Idempotent-Replayed: true`), a different body answers 422 `idempotency-key-reused`, failures store nothing                                                        | Done   | `replay-capacity.integration.spec.ts`: one session and one queued start for a repeated create; one queued command for a repeated setSpeed; a 409 followed by a retry with the same key succeeds                                                             |
| Boot recovery of `PENDING` insights: re-enqueued within the agents deadline (BullMQ job-id dedupe), templates published past it or with AI off, recap rebuilt                                                                                                                 | Done   | `insight-recovery.integration.spec.ts`: lost jobs re-enqueued once; expired → TEMPLATE with 12 narratives each and a complete recap, second pass a no-op; AI off → templates                                                                                |
| Fix found on the way: a late agent publication for a completed session whose runner had left memory did not rebuild the recap (eviction makes this common)                                                                                                                    | Done   | Regression test "rebuilds the recap for a late agent publication after the completed session left memory"                                                                                                                                                   |
| Retention job: sessions untouched for `SESSION_RETENTION_DAYS` (7) deleted with every dependent row in audited batches; idempotency keys older than `IDEMPOTENCY_RETENTION_HOURS` (24) pruned; advisory lock so one replica runs it; templates and audit kept                 | Done   | `retention.integration.spec.ts` (3 tests: exact per-table counts, zero rows left for the expired session, recent session untouched, 5 templates kept, audit intact; no-op run writes no audit; skipped while another holder has the lock)                   |
| Migration `0002_session_retention`: `ON DELETE CASCADE` on every fixture FK; indexes `replay_sessions_activity_idx`, `replay_sessions_updated_idx`, `idempotency_keys_created_idx`, partial `insights_pending_idx`                                                            | Done   | Applied by every integration test database                                                                                                                                                                                                                  |
| Compose `migrate` also seeds the templates (idempotent), so `docker compose --profile app up` is demo-ready. The api image now carries `fixtures/*.json`                                                                                                                      | Done   | Built the api image and ran the migrate command twice against an empty database: 5 templates inserted, then 5 unchanged. The first attempt from `workspace_modules/` failed to resolve `@matchiq/synthetic-data`; the command now runs from `node_modules/` |

### Limits

- A `PLAYING` session at 1× holds its slot until the match ends, even with no viewers. Viewer-presence eviction is not implemented.
- Capacity assumes one worker replica (ADR-0013). The API check is per org.
- Not verified against a live multi-hop deployment. The Azure Container Apps path does not set `TRUST_PROXY` yet.

## 2026-10-22 — MQ-021: Installable progressive web app (web)

| Area                                                                                                                                                                                                                                           | Status | Evidence                                                                                                                       |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Manifest from `app/manifest.ts` (`/manifest.webmanifest`): standalone, start URL `/fixtures`, scope `/`, dark canvas colours, synthetic-data description, categories, Fixture lobby shortcut                                                   | Done   | `manifest.spec.ts`; e2e `pwa.spec.ts` checks fields and icon sizes                                                             |
| Icons generated from `LogoMark` (192, 512, maskable 512, apple-touch 180, SVG, favicon 16/32/48) by `pnpm --filter @matchiq/web icons:generate`, using jiti and Playwright Chromium (no new dependency)                                        | Done   | Outputs committed in `apps/web/public`                                                                                         |
| Hand-written `public/sw.js`: precached `/offline` shell with its assets, stale-while-revalidate `/_next/static`, network-only for the API origin, `/stream`, `/api/`, SSE and non-GET; versioned caches cleaned on activate; served `no-cache` | Done   | e2e: worker controls the page, API responses never come from or enter the cache, offline reload shows the fallback (axe clean) |
| Update flow: new worker waits; "Update available — Reload" toast sends `SKIP_WAITING` and reloads on controller change. Registration is production-only (`PWA_ENABLED`)                                                                        | Done   | `service-worker.spec.ts` (8 tests)                                                                                             |
| "Install app" button on `beforeinstallprompt`, iOS "Share → Add to Home Screen" hint, dismissible; hidden when standalone                                                                                                                      | Done   | `use-install-prompt.spec.ts` (8), `pwa-prompts.spec.tsx` (2)                                                                   |
| `theme-color` for dark and light schemes, apple-touch-icon, `appleWebApp` metadata                                                                                                                                                             | Done   | `layout.tsx`                                                                                                                   |
| Install and offline guide                                                                                                                                                                                                                      | Done   | `docs/deployment/PWA.md`                                                                                                       |

### Limits

- No match data is available offline by design. The offline page needs one prior online visit.
- iOS has no install prompt API, so installation there is manual. Light-theme `theme-color` (`#f6f8fb`) is a placeholder until the light theme lands.
- Not yet installed on a physical Android or iOS device; verified in Chromium (desktop and Pixel 7 emulation).

## 2026-10-21 — Broadcast preview standby state and cue hold

| Area                                                                                                                                                                                                                                    | Status | Evidence                    |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | --------------------------- |
| The empty overlay preview showed "No approved cue on air" centred on the pitch markings, which read like an error. It now shows a muted "Standing by" chip in the cue slot, with the last aired cue, like a clean feed between graphics | Done   | `match-components.spec.tsx` |
| Cue hold control: Standard (4 s) or Extended (10 s) real-time dwell, for walk-throughs at 20–30×                                                                                                                                        | Done   | web 97 tests; e2e 60 passed |

## 2026-10-21 — Fix: replay speed lost when the worker restarts

| Area                                                                                                                                                                                                                               | Status | Evidence                                                                                                                              |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| A worker restart resumed PLAYING sessions at 1× (the rebuilt controller's default) instead of their persisted speed. Paused sessions also lost it for their next resume. Resume now re-applies the persisted speed before resuming | Done   | `replay.integration.spec.ts` "resumes a session after a worker restart at its persisted speed" (failed before the fix: speed 1 vs 20) |

## 2026-10-21 — E2: Judge flow on replay sessions, recap and Agent Observatory (web)

### Delivered

| Area                                                                                                                                                                                                                                                                                                                                               | Status | Evidence                                                                                               |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------ |
| Lobby from `GET /fixture-templates` (scenario label, seed, event count, events hash, synthetic badge, speed, Start) and recent sessions from `GET /replay-sessions`; Start calls `POST /fixtures/:templateId/sessions` and opens `/studio/{sessionId}`; loading, empty, error and 429 states. The old fixture start path is removed                | Done   | `lobby.spec.tsx`, e2e `lobby.spec.ts`                                                                  |
| Studio transport driven by the server: status hydrated from `GET /replay` and `replay.status`; the 202 prediction shows as "awaiting" until the worker confirms (REST read-back after 4 s); 409/429/503 inline; forward-only seek bounded by the template `eventCount`; Restart creates a new session                                              | Done   | `live-studio.spec.tsx`, e2e `studio.spec.ts`                                                           |
| Join mid-match: insights, narratives (current persona and locale), overlays, snapshot, events and replay status hydrate after the stream is accepted, then merge idempotently with the stream                                                                                                                                                      | Done   | `match-store.spec.ts` hydration cases, e2e "hydrates read models"                                      |
| Reconnect fix: the client sat in Connecting/Reconnecting until the API's first message (15 s heartbeat without Last-Event-ID) plus up to 30 s backoff. It now goes Live when the server accepts the stream, backoff is capped at 5 s and stale is flagged at 25 s (above the heartbeat)                                                            | Done   | `match-stream-client.spec.ts` "recovers within the capped backoff after an API restart", `sse.spec.ts` |
| Overlay on-air hold: a cue stays up for at least 4 s of real time after its match-clock window unless a newer cue replaces it or it is retracted; kind, priority, copy source (template revision 1, agent revision 2+) and "held" badges; en-GB broadcast fallback for other personas and locales; cue log separates Expired from Retracted        | Done   | `use-on-air-cue.spec.tsx` (fake timers)                                                                |
| Recap `/studio/{id}/recap`: result, key moments with evidence ids and reason codes, final metrics, narratives for the selected persona and locale with en-GB fallback, JSON export; "Recap available at full time" before then (polled)                                                                                                            | Done   | `recap-observatory.spec.tsx`, e2e `judge-flow.spec.ts`                                                 |
| Agent Observatory `/studio/{id}/observatory`: per insight status, publication (AGENT/TEMPLATE/PENDING), fallback reason, gate report with rejected items and issue codes, AgentRun table (agent, provider, deployment, prompt version, latency, retries, outcome). Providers are labelled plainly; template and mock are never presented as models | Done   | `recap-observatory.spec.tsx`                                                                           |
| Evidence drawer: triggering events resolved from the store or, when outside the loaded timeline, from `GET /fixtures/:id/events` with bounded paging; metric labels and formulas                                                                                                                                                                   | Done   | `studio-lib.spec.ts`, `live-studio.spec.tsx`                                                           |
| Four narrative locales including Nigerian Pidgin (`pcm-NG`) in the switcher, recap and tests; numbers unchanged across personas and locales                                                                                                                                                                                                        | Done   | `live-studio.spec.tsx`, e2e "offers four languages… at 390 px"                                         |
| Judge quick-start e2e (lobby → start → live → evidence by keyboard → persona and locale → overlay → recap → observatory) with axe WCAG 2.2 AA and overflow checks on every screen, desktop and mobile                                                                                                                                              | Done   | `judge-flow.spec.ts`                                                                                   |
| Manual run against the real local stack (API :3000 and worker :3001 from the main checkout, AI off) through a streaming CORS proxy on :3100 to a build on :4317                                                                                                                                                                                    | Done   | `docs/screenshots/real-*.png`                                                                          |

### Not done or limits

- Metric definitions are copied from the engine registry into `apps/web/src/constants/metrics.ts`, because the engine imports `node:crypto` and cannot be bundled for the browser. A `GET /metric-definitions` endpoint would remove the copy.
- The session's template comes from the documented `<templateId>_s<n>` id format, matched against the template list. The fixture contract has no template link.
- Trace minutes use the period from the recap once it exists; before full time the Observatory shows the period clock.
- Observed on the real stack: 19 insights, all `TEMPLATE` with provider `template` (AI off). Agent, mock, Ollama and Foundry rendering is covered by unit and e2e tests with mocked data only.
- Proposed `libs/contracts` additions: `FixtureTemplateSummary`, `ReplaySessionView`, `CreatedSession`, `RecapDocument`/`RecapMoment`/`RecapNarrative`, `InsightTrace`/`GateReport`/`GateRejection`/`InsightPublication`, a generic `ItemList<T>`, the events page envelope, `templateId` on session fixtures (or `GET /replay-sessions/:id`), and `period` on `InsightTrace`.

## 2026-10-21 — MQ-012: Nigerian Pidgin (pcm-NG) audience locale

### Delivered

| Area                                                                                                                                                        | Status  | Evidence                                                                           |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ---------------------------------------------------------------------------------- |
| ADR-0014: `pcm-NG` locale code rationale, spelling and register, number words, quality caveat                                                               | Done    | `docs/adr/0014-nigerian-pidgin-locale.md`                                          |
| Contract `Locale` gains `pcm-NG` (en-GB, fr-FR, es-ES, pcm-NG); JSON Schema and Pydantic regenerated; shared `PipelineRequest` sample requests `pcm-NG`     | Done    | `pipeline.spec.ts` locale tests; `test_api.py` and contract sample tests           |
| Worker: `copy-pcm.ts` for every insight kind × persona, Pidgin gate number words, recap order, 12 narratives per insight, policy and template version 1.1.0 | Done    | `copy-pcm.spec.ts`: every Pidgin variant passes the gate for all 5 golden fixtures |
| Agents: `phrases_pcm.py`, Pidgin metric labels, Fact Checker number words, Pidgin forbidden-claim phrasings, Localization prompt 1.1.0                      | Done    | `test_guard.py`, eval cases and attacks for `pcm-NG`, `test_golden.py`             |
| Football glossary for review                                                                                                                                | Partial | `docs/localization/PIDGIN_GLOSSARY.md`, **pending native-speaker review**          |

### Not done or limits

- The web locale switcher option belongs to the web stream: `{ value: 'pcm-NG', label: 'Naijá (Pidgin)', short: 'PCM' }`.
- Pidgin model output was exercised only with the mock provider and templates, not with Ollama or Foundry.
- The deterministic checks protect facts, names and forbidden claims, not style. Copy quality depends on the owner's review.

## 2026-10-21 — M2/M3: Replay sessions, intelligence pipeline, publish gate, overlays and recap (MQ-010, MQ-013)

### Delivered

| Area                                                                                                                                                                                                                                                        | Status                          | Evidence                                                                                                                                                                                   |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ADR-0013: templates vs sessions, forward-only seek, worker-owned playback, deterministic gate, overlay revisions                                                                                                                                            | Done                            | `docs/adr/0013-replay-sessions-and-intelligence-pipeline.md`                                                                                                                               |
| Migration `0001_replay_intelligence`: `fixture_templates`, `replay_sessions`, `insights`, `narratives`, `overlay_cues`, `agent_runs`, `match_snapshots`, `match_recaps` (all with `org_id`)                                                                 | Done                            | Applied by every integration test and the local smoke                                                                                                                                      |
| `pnpm seed:fixtures`: validates the 5 golden files with `validateFixtureFile` and upserts them idempotently                                                                                                                                                 | Done                            | Second run reports `unchanged` for all 5; integration test                                                                                                                                 |
| Replay API: `POST /fixtures/:templateId/sessions`, `POST/GET /fixtures/:sessionId/replay` (409 `replay-state-conflict`, own `REPLAY_RATE_LIMIT_PER_MINUTE` throttler), `GET /fixture-templates`, `GET /replay-sessions`; BullMQ `replay-commands` transport | Done                            | `replay.integration.spec.ts` (api), 409 and 429 cases                                                                                                                                      |
| Worker: one serial `SessionRunner` per session, batched transactions (ledger, stream messages and read models), snapshot cadence, moments, overlay scheduler, template fallback, recap, resume after restart                                                | Done                            | `replay.integration.spec.ts` (worker): ledger hash equals the manifest, score 3-2, 5 goals, overlays published and retracted, identical stream hash on a second run and across speeds      |
| Deterministic publish gate (cited values, numerals in text, evidence ids, entity allowlist, persona lengths, requested variants)                                                                                                                            | Done                            | `publish-gate.spec.ts`; every template variant for every golden insight passes                                                                                                             |
| Agents client (`/api/v1/pipeline/runs`, bearer token, `deadlineMs + 1.5 s` timeout, retriable classification, circuit breaker), BullMQ `insight-pipeline` jobs with idempotent publication                                                                  | Done against a fake HTTP server | `agents.integration.spec.ts`: 3×3 agent narratives, an unsupported number rejected and replaced by a template, timeout retry then fallback, duplicate and concurrent delivery publish once |
| Read APIs: `state`, `insights`, `narratives?persona=&locale=`, `overlays`, `recap`, `agent-runs`                                                                                                                                                            | Done                            | `intelligence.integration.spec.ts` and the local smoke                                                                                                                                     |
| Performance smoke (`pnpm perf:replay`)                                                                                                                                                                                                                      | Done                            | Max speed: 1,470 events in 1.6 s (≈ 900 events/s). At 30× in real time: event-to-ledger p95 74 ms, event-to-snapshot p95 536 ms (synthetic local load, not an SLA)                         |

### Local smoke (built API on :3100, built worker on :3101, own database and Redis prefix, AI disabled)

A `comeback` session at 30×, streamed with `curl -N` from `Last-Event-ID: 0` for 130 s, delivered 1,470 `match.event`, 288 `match.snapshot`, 19 `insight.detected`, 171 `narrative.ready` (19 × 9), 18 `overlay.publish`, 18 `overlay.retract` and 3 `replay.status` messages. Afterwards `/state` reported COMPLETED 3-2, `/recap` listed 19 key moments including 5 goals, and pausing the finished session answered 409.

### Not done or limits

- The live agents service was not exercised end to end in this PR. The client is tested against a fake server that follows the PR #11 contract.
- Sessions run in a single worker replica. Insights left `PENDING` by a crash between commit and job enqueue are not re-enqueued on boot.
- Corrections are projected, but moments are not re-detected after a correction. There is no producer approval yet: cues are `AUTO_APPROVED`.
- The compose `migrate` job does not seed templates. Run `pnpm seed:fixtures` against the database.
- `ReplaySessionView`, `FixtureTemplateSummary`, `RecapDocument`, `InsightTrace`, `GateReport` and the `{ items }` lists are local types in `libs/db` until they are added to `libs/contracts`.

## 2026-10-21 — MQ-011: Fixture lobby, live studio and resumable match stream (web)

### Delivered

| Area                                                                                                                                                                                                                       | Status  | Evidence                                                                                      |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------- |
| Typed REST client: Zod-validated responses, RFC 9457 problem errors, idempotency key on replay commands, TanStack Query hooks                                                                                              | Done    | `http-client.spec.ts` (8 tests)                                                               |
| `MatchStreamClient`: streaming-fetch SSE, `StreamMessage` validation, dedupe by `streamSequence`, `Last-Event-ID` resume, capped jittered backoff, gap → snapshot refetch, staleness, offline                              | Done    | `match-stream-client.spec.ts`, `sse.spec.ts` (15 tests)                                       |
| Zustand match store: batched apply, bounded timeline, monotonic snapshots, momentum series, narratives by persona/locale, overlay revisions and retraction tombstones, seek reset                                          | Done    | `match-store.spec.ts` (14 tests)                                                              |
| `/fixtures` lobby and `/studio/[fixtureId]` live studio: scoreboard, timeline, insight feed, evidence drawer, live metrics, momentum chart with table, 16:9 overlay preview, replay transport, persona and language switch | Done    | `live-studio.spec.tsx`, component specs; Playwright lobby and studio specs, desktop + mobile  |
| Accessibility: axe WCAG 2.2 AA (no serious/critical) on lobby, studio and open drawer; keyboard drawer with focus return; throttled live announcements; reduced motion                                                     | Done    | Playwright (46 tests per run, both projects)                                                  |
| End-to-end against the real API and worker                                                                                                                                                                                 | Partial | **UI wired to the contract; not yet exercised against a live backend.** All network is mocked |

### Notes

- Aligned with the merged API (PR #9): `{ items }` fixture list, `{ items, nextAfterSequence }` event pages, id-less heartbeats, stream connects after state is loaded. Smoke-checked from Node against the local API: fixtures, fixture, events and `?lastEventId` stream frames all validate. `/state` and `/replay` are not built yet; the studio degrades to an awaiting state and shows replay command errors inline.
- Momentum history and replay length are not in `libs/contracts`; momentum is built from streamed snapshots. Proposals are in the PR.
- The stream uses streaming `fetch`, because `EventSource` cannot set `Last-Event-ID` on a client-managed reconnect. The API must allow the `Last-Event-ID` request header in CORS.
- Review screenshots: `docs/screenshots/` (`CAPTURE_SCREENSHOTS=1 pnpm e2e`).

## 2026-10-21 — M2: Evidence-grounded multi-agent pipeline (MQ-009)

| Area                                                                                                                                   | Status            | Evidence                                                                                                              |
| -------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------- |
| Orchestration on Agent Framework graph workflows (`WorkflowBuilder`, `Executor`), typed FSM `DETECTED → ANALYZED → DRAFTED → VERIFIED` | Done              | ADR-0011; `tests/test_pipeline.py`                                                                                    |
| Roster: Match Analyst, Narrative Writer, Fact Checker, Localization, Broadcast Producer, with versioned prompts (all `1.0.0`)          | Done              | `apps/agents/src/matchiq_agents/roster/`                                                                              |
| Deterministic Fact Checker (cited values, evidence ids, entity allowlist, forbidden lexicon, lengths), then an optional AI critique    | Done              | `tests/test_guard.py`                                                                                                 |
| REVISE regenerates once; REJECT falls back to verified templates or is suppressed; timeouts, 2 retries with backoff, circuit breaker   | Done              | `tests/test_resilience.py`, `tests/test_pipeline.py`                                                                  |
| Prompt-injection defence: untrusted fields as escaped JSON data blocks; unsafe entity names dropped from the allowlist                 | Done              | Adversarial cases in `tests/eval/`                                                                                    |
| `POST /api/v1/pipeline/runs` with service-token auth (constant-time) and RFC 9457 401/422                                              | Done              | `tests/test_api.py`                                                                                                   |
| Model port: `mock`, `ollama` (`OpenAIChatClient`), `foundry` (`FoundryChatClient`); `/health/ready` probes Ollama                      | Done              | `tests/test_providers.py` (fake agent, no network)                                                                    |
| Evaluation: 33 golden and 6 adversarial-input cases, plus 10 compromised-model attacks, with an independent oracle                     | Done              | CI (mock and templates): 0 unsupported numbers, 0 unknown entities, 0 leaks; fallback verified with the model failing |
| Live Ollama evaluation                                                                                                                 | **Not run**       | Pending local model download; `OLLAMA_LIVE=1 uv run pytest -m ollama`, `scripts/run_eval.py --provider ollama`        |
| Live Foundry call                                                                                                                      | **Not exercised** | No Azure subscription (ADR-0012). Adapter covered by contract tests only                                              |

### Known limitations

- Entity detection relies on capitalisation and exempts the first word of each sentence, so a sentence that opens with an unknown name is not flagged.
- Number words are recognised for 2 to 20 only. "one", "un" and "uno" are skipped because they double as articles.
- The contract has no issue code for AI-critique concerns, so they are reported as `UNCITED_EVIDENCE`. After a fallback, `verification` describes the served template drafts, and the rejected drafts' issue codes appear in `fallbackReason`.
- Metric labels for unknown metric families fall back to split camelCase in English, in every locale.

### Proposed contract changes

- `VerificationIssueCode`: add `UNGROUNDED_CLAIM` for critique concerns.
- `EntityAllowlist.teams[]`: add `side: home | away`, so narratives can name the team behind `*.home.*` and `*.away.*` metrics.
- `PipelineResult`: add an optional `rejectedVerification`, to keep the rejected agent drafts' issues alongside the served verification.

## 2026-10-21 — Fix: secret-scan scope blocking every PR

| Area                                                                                                                                                                                                    | Status | Evidence                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| CI's `fetch-depth: 0` fetched every remote branch, so gitleaks flagged an Azure built-in role ID in an unmerged infra branch and failed every PR and `dev`. The scan is now scoped to `--log-opts=HEAD` | Done   | `ci.yml`                                                                                                                                           |
| `.gitleaks.toml`: default rules plus one allowlist (role-ID GUID variables in `infra/**/*.bicep`, condition AND)                                                                                        | Done   | Local check: without config the line is flagged as `generic-api-key`; with config it is allowed, and a GitHub PAT in the same file is still caught |

## 2026-10-21 — Infrastructure, packaging and deployment strategy (MQ-014)

### Delivered

| Area                                                                                                                                                                                                                                                                                                                                                                                             | Status  | Evidence                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Production Dockerfiles for api, worker, web and agents. Each is multi-stage, uses a base image pinned by digest (`node:22.22.3-bookworm-slim`, `python:3.12.15-slim-bookworm`, `uv:0.13.4`), runs as a non-root user, has a `HEALTHCHECK` and bakes in no secrets. Nest apps use `nx run <app>:prune` plus `pnpm install --frozen-lockfile --prod`.                                              | Done    | All four images built locally. Sizes: api 279 MB, worker 266 MB, web 284 MB, agents 277 MB.                                                                           |
| Compose `app` profile (one-shot migrate job, then api, worker, agents and web) on the existing Postgres and Redis. Compose `ai` profile with CPU Ollama. `docker compose up` with no profile still starts only Postgres and Redis.                                                                                                                                                               | Done    | Every service reported `(healthy)`. Liveness returned 200 on `:3000`, `:3001` and `:8000`. api readiness reported Postgres and Redis ok. web `/` returned 200.        |
| `infra/vps`: Caddy (auto-TLS, SSE flush) overlay for hosting on a single server                                                                                                                                                                                                                                                                                                                  | Done    | `docker compose -f docker-compose.yml -f infra/vps/compose.vps.yml --profile app config` is valid. It refuses to start without real secrets.                          |
| `infra/azure`: Bicep for Log Analytics, App Insights, Container Apps environment, 4 apps plus a migrate job, ACR, PostgreSQL 17 Flexible Server, Azure Managed Redis, Key Vault, user-assigned identity with AcrPull / Key Vault Secrets User / Foundry User, Foundry account + project + model deployment, and a budget. Parameters for dev, stage and prod use `readEnvironmentVariable` only. | Partial | `az bicep build`, `az bicep lint` and `build-params` (Bicep 0.48.1) pass with zero diagnostics. **Not deployed; `what-if` not run** because there is no subscription. |
| `.github/workflows/deploy-azure.yml`: `workflow_dispatch` only, OIDC (`azure/login` pinned to its SHA), a what-if job, then an approval-gated deploy (platform, then image push, then apps, then migrations, then smoke test)                                                                                                                                                                    | Partial | Never run. It needs the owner to set up federated credentials and environments.                                                                                       |
| CI: `container` job (matrix build of all four images) and `infra` job (Bicep build and lint)                                                                                                                                                                                                                                                                                                     | Done    | They first run on this PR.                                                                                                                                            |
| `docs/deployment/HOSTING_OPTIONS.md` (seven options with sourced prices, 2026-10-21) and `LOCAL_STACK.md`                                                                                                                                                                                                                                                                                        | Done    | Primary recommendation is a single VPS with compose and Caddy; fallback is Railway. **Pending owner approval.**                                                       |

### Findings

- Compose uses explicit `environment:` blocks with `.env` interpolation instead of `env_file: .env`. This keeps compose-DNS URLs authoritative over the host `localhost` URLs in `.env`. `libs/config` now treats blank optional values as unset (MQ-001 fix), but `apps/agents` settings still reject an empty `FOUNDRY_PROJECT_ENDPOINT`.
- GitHub Models was retired on 2026-07-30, so there is no free hosted LLM option. Oracle Always Free has been cut to 2 OCPU / 12 GB. Hetzner CX plans are shown as unavailable.
- The agents service accepts only `mock` and `foundry` today. The compose `ollama` service is staged for the ADR-0012 provider, which has not been implemented yet.

### Next

Owner decision on demo hosting (VPS or Railway) and on an Azure subscription. Then run a first `what-if`, load the golden fixtures into the hosted stack, and add an external uptime check.

## 2026-10-21 — Fix: blank optional env values

| Area                                                                                                                                                                            | Status | Evidence              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | --------------------- |
| `cp .env.example .env` made the API exit: blank `OTEL_SERVICE_NAME` and `APPLICATIONINSIGHTS_CONNECTION_STRING` failed `min(1)`. Blank optional values are now treated as unset | Done   | `load-env.spec.ts`    |
| Regression guard: the committed `.env.example` (with only secrets filled) must parse for the api, worker and web schemas                                                        | Done   | `env-example.spec.ts` |

## 2026-10-21 — Refactor: single canonical JSON and hashing utility

| Area                                                                                                                                                                    | Status | Evidence                                                          |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------- |
| Three copies of canonical JSON + SHA-256 (`libs/db`, `libs/football-engine`, `libs/synthetic-data`) replaced by `@matchiq/canonical-json` (`scope:shared`, `type:util`) | Done   | Engine golden state hashes and committed fixture hashes unchanged |
| `@matchiq/db` keeps its public `sha256Hex(value)` API, now backed by the shared library                                                                                 | Done   | db 15 tests, api 53 tests                                         |

## 2026-10-21 — M1: Synthetic generator and replay engine (MQ-003, replay part of MQ-004)

### Delivered

| Area                                                                                                                                                                                                                                                              | Status | Evidence                                                                                                |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------- |
| `libs/synthetic-data`: seeded mulberry32 PRNG, fictional clubs and 18-player squads, rule-based possession state machine (passes, carries, pressure, tackles, fouls, cards, shots, saves, goals, substitutions, restarts) over two halves plus stoppage           | Done   | 55 Vitest tests, including fast-check properties across random seeds and all five scenarios             |
| Five scenario presets (`comeback`, `possession-dominance`, `red-card-swing`, `high-press`, `low-event`), shaped by team parameters and scripted beats. Results for the scripted scenarios hold for every seed                                                     | Done   | Property tests assert each scenario's outcome for random seeds                                          |
| `validateFixtureEvents` / `validateFixtureFile`: contract parsing, sequences, IDs, clocks, period structure, player/team/on-pitch checks (substitutions and dismissals respected), reference integrity, GOAL-only scoring, manifest check. Returns typed issues   | Done   | Mutation tests for every issue code                                                                     |
| Canonical JSON + SHA-256 event hash; `pnpm generate:fixture` and `pnpm validate:fixture` (build, then run the compiled ESM CLI)                                                                                                                                   | Done   | CLI run end-to-end from the root scripts; CLI unit tests with injected IO                               |
| Golden fixtures for all five scenarios (seed 42) in `fixtures/`, with a manifest table                                                                                                                                                                            | Done   | `golden.spec.ts` regenerates each file and compares it with the committed JSON and a pinned hash        |
| `libs/replay`: `Scheduler` port (system + `ManualScheduler`), `ReplayController` implementing `ReplayCommand`/`ReplayStatus` with pacing by clock gaps ÷ speed (gaps capped at 5 s, 3 s period break), pause/resume/setSpeed/seek with reset signal, typed errors | Done   | 17 Vitest tests, including a fast-check property over random command interleavings and 1× vs 30× parity |

### Notes

- Event density is about 1,000 (low-event) to 1,470 (comeback) events per match at seed 42. `matchClockMs` restarts at 0 in each period.
- Not in this PR: replay checkpoints, the proposed `pnpm replay` CLI, HTTP/SSE wiring and correction handling. These belong to the backend stream (MQ-004/006); `ReplayController` is ready to be wrapped.
- Own goals are never generated. The validator credits an own goal to the opponent of `GOAL.teamId`, which is an assumption the contract does not yet state.

### Next

Football engine projections over these fixtures (MQ-005), ingest/replay API on top of `ReplayController` (MQ-004/006), and correction and out-of-order fixtures for the ingest tests.

## 2026-10-21 — M1: Event ledger, idempotent ingest and resumable SSE (MQ-004, MQ-006)

### Delivered

| Area                                                                                                                                                                                                     | Status  | Evidence                                                                                                     |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------ |
| `libs/db`: Drizzle schema, migration `0000_event_ledger` (`fixtures`, `match_events`, `stream_messages`, `audit_events`, `idempotency_keys`, all with `org_id`), ports and Postgres/Redis adapters       | Done    | `pnpm nx run db:migrate` applied to local Postgres; 15 Vitest tests (8 integration on real Postgres + Redis) |
| ADR-0006 accepted: Drizzle, Postgres ledger, transactional outbox to Redis pub/sub                                                                                                                       | Done    | `docs/adr/0006-persistence-and-messaging.md`                                                                 |
| Fixtures API: `POST /fixtures` (operator, 201/409), `GET /fixtures`, `GET /fixtures/:id`, `GET /fixtures/:id/events` (cursor `afterSequence`, limit ≤ 500)                                               | Done    | `fixtures.integration.spec.ts`, `ingest.integration.spec.ts`                                                 |
| Ingest `POST /fixtures/:id/events:batch`: one transaction for events, duplicate counting, 409 on changed body or taken sequence, 422 on fixture mismatch, 404 on unknown fixture, outbox rows, audit row | Done    | `ingest.integration.spec.ts` (10 tests), `classify-batch.spec.ts`, `ingest.service.spec.ts`                  |
| Optional `Idempotency-Key` on both POSTs: replay of the stored response, 422 when reused with a different body                                                                                           | Done    | Integration tests for both endpoints                                                                         |
| Operator bearer guard (SHA-256 + `timingSafeEqual`), 401 problems with `WWW-Authenticate`; reads anonymous; `@nestjs/throttler` at `RATE_LIMIT_PER_MINUTE`                                               | Done    | `operator-auth.guard.spec.ts`, `operator-access.integration.spec.ts`                                         |
| Outbox relay in the API process: `FOR UPDATE SKIP LOCKED`, at-least-once, kicked after commit plus polling                                                                                               | Done    | `outbox-relay.spec.ts`, `ledger.integration.spec.ts`                                                         |
| SSE `GET /fixtures/:id/stream`: `Last-Event-ID` or `?lastEventId=` replay from Postgres, then live Redis messages, gap fill and de-duplication by `streamSequence`, heartbeats, cleanup on disconnect    | Done    | `stream.integration.spec.ts`, `stream-session.spec.ts`; curl smoke test against the built API                |
| Postgres and Redis readiness indicators (503 when either is down)                                                                                                                                        | Done    | `health.indicators.spec.ts`, `app.module.spec.ts`                                                            |
| CI `verify` job gets Postgres 17.6 and Redis 8.2 service containers for the integration tests                                                                                                            | Partial | Workflow updated; proven by the PR run                                                                       |

### Findings fixed during M1

- The relay first drained in `created_at` order. Concurrent transactions share no commit order with `now()`, so the integration test caught out-of-order publication. It now drains in `(org_id, fixture_id, stream_sequence)` order with a matching partial index.
- A real ioredis client left a connect timer alive after `disconnect()` against a refused port, which held Jest workers open. The readiness test uses a rejecting PING instead.

### Known limitations

- Out-of-order or gapped event sequences are accepted as long as they are unique; the §24 reorder window and dead-letter queue are not implemented.
- Rate limiting uses in-memory storage per API instance and keys by socket address (no `trust proxy` yet).
- SSE does not apply per-connection backpressure, and a fresh connection without `Last-Event-ID` starts at the live head (clients load the snapshot first, ADR-0005).
- `GET /fixtures` returns at most 100 fixtures without a cursor.

### Next

Snapshot projection wired to the outbox (`match.snapshot`), replay controls, worker consumers on the same outbox.

## 2026-10-21 — Local-first AI providers (ADR-0012)

| Area                                                               | Status                                                          | Evidence                                               |
| ------------------------------------------------------------------ | --------------------------------------------------------------- | ------------------------------------------------------ |
| Azure subscription                                                 | **Blocked (owner)**: account has no subscription and no credits | `az login` reports "No subscriptions found"            |
| Decision: local-first, cloud-ready (`mock` / `ollama` / `foundry`) | Done                                                            | ADR-0012                                               |
| `ModelProvider` contract includes `ollama`                         | Done                                                            | Vitest `pipeline.spec.ts`; regenerated Pydantic models |

## 2026-10-21 — M1: Football engine (MQ-005, MQ-007)

### Delivered

| Area                                                                                                                                                                                | Status | Evidence                                                                |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------- |
| `libs/football-engine` (`scope:shared`, `type:domain`): pure `createInitialState`, `applyEvent`, `project`, `toSnapshot` producing contract `MatchSnapshot` with sha256 `stateHash` | Done   | `projection.spec.ts`, Zod-parsed in every snapshot test                 |
| Idempotent application (duplicate sequence or eventId is a no-op), out-of-order re-fold, `provisional` while a sequence gap or a pending correction exists                          | Done   | Property: any arrival order plus duplicates equals in-order projection  |
| CORRECTION (VOID) by re-folding the ledger without voided events                                                                                                                    | Done   | `corrections.spec.ts`                                                   |
| Metrics with a versioned `MetricDefinition` registry: counts, pass completion (ZERO_DENOMINATOR), time-weighted possession with contested time excluded, event-share proxy fallback | Done   | `counting.spec.ts`, `possession.spec.ts`, `verify-and-registry.spec.ts` |
| Rolling 5-minute and previous-window metrics, momentum index (spec §9 weights, bounded z against a fixed reference scale, `heuristic: true`)                                        | Done   | `momentum.spec.ts` asserts hand-computed values                         |
| Key moments with full evidence envelopes: GOAL and RED_CARD (P0), SHOT_BURST, HIGH_REGAINS, PRESSURE_SWING, MOMENTUM_SHIFT (P1); debounce; deterministic ids; resumable cursor      | Done   | `moments.spec.ts`, `golden.spec.ts`; every insight Zod-parsed           |
| `verifyCitedValues` and `verifyEvidenceIds` for the publish gate                                                                                                                    | Done   | `verify-and-registry.spec.ts`                                           |
| Golden fixtures with pinned state hashes (zero-event match, late comeback with void, own goal and second yellow)                                                                    | Done   | `golden.spec.ts`                                                        |
| Property tests (fast-check 4.10.2): determinism, order independence, score oracle, non-negative counts, bounded percentages and momentum, contract-valid insights                   | Done   | 60 Vitest tests in 9 files                                              |

### Known limitations

- Momentum reference means and deviations are product calibration constants for synthetic fixtures, not league statistics. Recalibrate once the synthetic generator's distributions are fixed.
- Re-folding is O(ledger) per late event or correction (about 3 ms for 3,000 events locally). The in-order path is incremental.
- `stepMoments` serves the in-order path. After a correction or a late event the worker re-runs `detectKeyMoments` and diffs by `insightId` to retract or add insights.
- PLAYER_MILESTONE (P2) is not implemented.

### Next

Wire the engine into the worker projection and the deterministic publish gate, and add golden replay tests against the synthetic generator's seeded fixtures.

## 2026-10-21 — M2 groundwork: pipeline contracts (MQ-009)

| Area                                                                                                                                                      | Status | Evidence                                        |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------- |
| `PipelineRequest`, `PipelineResult`, `NarrativeDraft`, `OverlayProposal` contracts for the worker ↔ agents boundary, exported to JSON Schema and Pydantic | Done   | Vitest `pipeline.spec.ts`; pytest sample parity |
| JSON Schema export drops Zod's duplicate regex for every `format` (date-time, uuid) so generated models validate                                          | Done   | `json-schema.spec.ts`                           |
| `agents` lint, typecheck and test depend on `codegen` (removes a race with regeneration)                                                                  | Done   | `project.json`                                  |

## 2026-10-21 — M0: Foundation (MQ-001, MQ-002)

### Delivered

| Area                                                                                                                                                                                                      | Status  | Evidence                                                                                                     |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------ |
| Nx 23 + pnpm 10 workspace, strict TS, ESLint (boundaries, size and complexity caps), Prettier, pinned dependencies                                                                                        | Done    | `pnpm verify`                                                                                                |
| Docker Compose: Postgres 17.6, Redis 8.2 (ports 54320, 63790)                                                                                                                                             | Done    | Both containers healthy                                                                                      |
| CI: PR title, promotion path, verify, e2e, gitleaks, `pnpm audit`, `pip-audit`                                                                                                                            | Done    | Workflow committed; first run happens on the PR                                                              |
| Governance docs, 10 ADRs, CODEOWNERS, PR template                                                                                                                                                         | Done    | `docs/engineering`, `docs/adr`                                                                               |
| `libs/contracts`: Zod v1 contracts for fixtures, teams, players, 22 event types, snapshots, evidence, insights, agents, narratives, overlays (with state machine), replay, SSE envelopes, problem details | Done    | 44 Vitest tests                                                                                              |
| `libs/config`: validated env schemas that never echo secrets                                                                                                                                              | Done    | 6 tests                                                                                                      |
| `libs/server-kit`: helmet, CORS, RFC 9457 problems, request IDs, health module, `EnvModule`                                                                                                               | Done    | 10 Jest tests                                                                                                |
| `apps/api`, `apps/worker`: Nest bootstrap with live/ready health under `/api/v1`                                                                                                                          | Done    | 3 + 2 Jest tests; built server smoke-tested                                                                  |
| Cross-language contracts: JSON Schema export, Pydantic codegen, shared samples validated in both languages                                                                                                | Done    | Vitest `samples.spec.ts`, pytest `test_contract_samples.py`                                                  |
| `apps/agents`: FastAPI, Agent Framework 1.22 + Foundry 1.15 client factory, settings, health, Foundry probe script                                                                                        | Partial | 20 pytest tests; Ruff and Pyright strict clean. **Live Foundry call not yet exercised** (needs Azure access) |
| `apps/web`: Tailwind v4 design tokens, icon components, UI primitives, landing shell                                                                                                                      | Done    | 9 Vitest + 10 Playwright/axe tests (desktop and mobile)                                                      |

### Findings fixed during M0

- Duplicate `@nestjs/common` copies came from mismatched `rxjs` peer versions. Fixed with pnpm overrides.
- Zod emitted a regex `pattern` alongside `format: date-time`, which Pydantic cannot apply to parsed datetimes. The exporter now drops it, and a test covers this.
- The generated Next.js 16.1.7 had 2 critical and 18 high advisories. Upgraded to 16.4.2; `pnpm audit --prod` is now clean.
- axe found a WCAG contrast failure on `ink-subtle`. The token was raised to `#788494` (≥ 4.6:1 on all surfaces).

### Azure and Foundry access spike

| Check                                                           | Result                                                                                                                                                                               |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Agent Framework Python SDK available and compatible             | **Verified.** `agent-framework-core` 1.22.0 (2026-10-15) and `agent-framework-foundry` 1.15.0 install on Python 3.12, and the constructor and `run` signatures match Microsoft Learn |
| Azure CLI                                                       | Installed (2.91.0). **Not logged in.** Requires the owner's `az login`                                                                                                               |
| Subscription, resource group and deployment permissions         | **Unverified.** Blocked on login                                                                                                                                                     |
| Foundry project endpoint and model deployment, quota and region | **Unverified.** Blocked on login and project details                                                                                                                                 |
| End-to-end structured-output call                               | **Not run.** `apps/agents/scripts/foundry_probe.py` is ready                                                                                                                         |

### Next

M1: MQ-003 seeded generator, MQ-004 ledger and idempotent ingest, MQ-005 deterministic metrics, MQ-006 SSE and snapshot reconciliation.

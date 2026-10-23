# Demo video script

## Length: under 2 minutes

The official rules (§4.4) require a video **less than two minutes** long, and judges are not required to watch beyond two minutes. Spec §2 and §34 say the same. The brief for this document asked for 2–3 minutes, so it contains:

- **The submission cut: 1:50 target, 1:55 hard limit.** This is the only cut to upload.
- **An extended walkthrough of about 2:50** for a live presentation or a pitch call. Do not upload it as the submission video.

The video must also:

- show the project working on its intended platform (desktop browser);
- be hosted at a public URL on YouTube, Vimeo, Facebook Video or Youku;
- contain no third-party trademarks or copyrighted music (rules §4.4);
- be in English, or come with an English translation (rules §4.9).

## Setup (do this before recording)

### 1. Environment

Run the native stack (README Option B), because sign-in and Ollama need it. In `.env`:

```bash
APP_ENV=local
# secrets: openssl rand -hex 32 for each
STREAM_TICKET_SECRET=…
AGENTS_SERVICE_TOKEN=…
WEB_SESSION_SECRET=…
# real local inference
AI_ENABLED=true
MODEL_PROVIDER=ollama
OLLAMA_MODEL=qwen2.5:7b-instruct
AGENT_TIMEOUT_MS=120000
AGENT_JOB_CONCURRENCY=1
AGENT_CIRCUIT_RESET_MS=60000
# demo-only switches (each service refuses DEMO_FAULTS_ENABLED when APP_ENV=prod)
DEMO_FAULTS_ENABLED=true
NEXT_PUBLIC_DEMO_MODE=true      # shows the lobby "Demo scenario" select and the sign-in demo accounts
```

`NEXT_PUBLIC_DEMO_MODE` is read when the web app is built or started, so restart `pnpm nx dev web` after changing it.

### 2. Commands

```bash
OLLAMA_KEEP_ALIVE=30m ollama serve      # separate terminal; keeps the model loaded
ollama pull qwen2.5:7b-instruct
pnpm infra:up && pnpm nx run db:migrate && pnpm seed:fixtures
pnpm dev
```

Check that `curl -s localhost:8000/api/v1/health/ready` does not report `degraded` for the model.

### 3. Pre-run sessions

Local inference takes about a minute per insight (p50 64.7 s in the recorded baseline), so agent copy cannot appear inside a 2-minute take. Prepare two sessions in advance and say on screen that they were run earlier:

1. **Session A (real agent chain).** In the lobby, start _Late comeback_ at 5× with "No simulated failure". Let it finish; it takes about 12 minutes. Its Observatory then shows `ollama` runs for Analyst, Writer, Producer and Localization, with the deterministic Fact Checker.
2. **Session B (simulated failure).** Start _Late comeback_ with Demo scenario **"Fact Checker rejects a draft, then a revision passes"** (`WRITER_REVISE`), or **"Model times out; templates air, breaker opens"** (`MODEL_TIMEOUT`). Let at least the first insight finish.

Close other heavy applications while these run. Under heavy load, local calls time out and templates stay on air. That is correct behaviour, but it is not what this shot list shows.

### 4. Browser

- Chromium at 1920×1080 at 100% zoom, a clean profile with no extensions, notifications off.
- Studio cue hold set to **Extended (10 s)**, so overlays stay readable at speed.
- One window signed out (public demo) and one private window for the producer sign-in.

## Submission cut (1:50)

Use captions throughout. Use no music, or only music you made or licensed. Each caption is also the voice-over line.

| #   | Time      | Shot                                                                                                                                                                                  | Caption and voice-over                                                                                                                                                                                              |
| --- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 0:00–0:08 | Landing page hero, with the synthetic-data label visible                                                                                                                              | "Live football needs context in seconds, and AI must never invent a number on air. MatchIQ: evidence-grounded match intelligence. All data here is synthetic."                                                      |
| 2   | 0:08–0:16 | Lobby: the _Late comeback_ card (seed, event count, hash). Set the speed to 20× and press **Start**                                                                                   | "A seeded generator creates realistic fixtures. Start a replay: every viewer sees the same event stream."                                                                                                           |
| 3   | 0:16–0:32 | Live studio: scoreboard, event timeline, live metrics, momentum chart. An insight lands in the feed and its lower third wipes into the 16:9 preview                                   | "A deterministic engine computes every statistic and detects key moments. A verified template cue goes on air at once, even with AI switched off."                                                                  |
| 4   | 0:32–0:44 | Click the insight to open the **evidence drawer**: source events, metric values and formula, counter-evidence                                                                         | "Every claim cites engine metrics and the exact source events."                                                                                                                                                     |
| 5   | 0:44–0:58 | Switch persona Casual → Analyst → Broadcast, then locale EN → FR → **PCM (Naijá)**. Toggle light/dark once                                                                            | "Three audiences, four languages, including Nigerian Pidgin. Same facts, different stories."                                                                                                                        |
| 6   | 0:58–1:16 | Open **Session A → Agent Observatory**. Point at the run table: provider `ollama`, model `qwen2.5:7b-instruct`, prompt version, latency, Fact Checker, gate report, publication AGENT | "Recorded earlier with real local inference: five Microsoft Agent Framework agents analyse, write, fact-check, produce and localise. Agents only propose. A deterministic gate checks every number before it airs." |
| 7   | 1:16–1:30 | Open **Session B → Observatory**. Show the **Simulated failure (demo)** badge and the failure and recovery chain                                                                      | "Simulated failure, labelled as such: a draft cites a number the engine never produced. The checker sends it back, the revision passes, or the template airs. Nothing ungrounded is published."                     |
| 8   | 1:30–1:42 | Private window: sign in as `harbour.producer`. Press **Freeze**: the FROZEN banner appears. Open the **Audit trail**: the freeze row with actor and reason                            | "Producers stay in control: freeze, retract, suppress, an organisation kill switch, and a full audit trail."                                                                                                        |
| 9   | 1:42–1:50 | Recap page (full-time result, key moments), then the end card: architecture diagram and `github.com/WapSecure/matchiq`                                                                | "Automatic recaps, an OpenAPI contract, open source. Built on Microsoft Agent Framework, with Foundry and Azure ready to switch on."                                                                                |

Keep the last line exact. "Ready to switch on" describes code that exists but has not been run against Azure. Do not say "running on Azure" or "powered by Foundry".

## Extended walkthrough (about 2:50, not for upload)

The same shots as the submission cut, plus:

| After shot | Duration | Shot                                                                                                                                  | Line                                                                                                                                 |
| ---------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 3          | 0:10     | Pitch event map with team and type filters                                                                                            | "Shots, goals, recoveries and final-third entries, plotted from the live window."                                                    |
| 7          | 0:12     | A second fault session with `MODEL_TIMEOUT`: Analyst TIMED_OUT, template FALLBACK, breaker open                                       | "When the model is down, templates stay on air and the breaker protects the system."                                                 |
| 8          | 0:15     | Kill switch: enter a reason, type `KILL` to confirm; the overlay shows "Kill switch active". Release it                               | "One switch takes every cue off air across the organisation, and the action is audited."                                             |
| 8          | 0:08     | Sign in as `northbank.producer`: `org_demo` sessions are not listed                                                                   | "Tenants are isolated in the API and in Postgres row-level security."                                                                |
| 9          | 0:10     | <http://localhost:3000/api/v1/docs> (Swagger UI)                                                                                      | "An OpenAPI 3.1 contract generated from the same schemas the services use."                                                          |
| 9          | 0:10     | Optional: Grafana at `:3300` (`docker compose --profile observability up -d` and `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318`) | "Structured logs, traces and metrics." Show it only if the stack works on the day: it has been validated statically, not end to end. |

## Recording checklist

- [ ] Final length checked in the editor: **under 2:00**, ideally 1:50.
- [ ] Every shot is the real running app, with no mock-ups (spec §19).
- [ ] The synthetic-data label is visible in the opening shot and in the studio.
- [ ] Session A's Observatory shows `ollama` rows. Mock rows are labelled mock and never presented as a model.
- [ ] The fault chain is captioned "Simulated failure".
- [ ] The narration says the agent sessions were recorded earlier.
- [ ] Nothing claims that Foundry or Azure is running.
- [ ] No Premier League marks, real club names, real players, footage or copyrighted music.
- [ ] Dev-only credentials are acceptable on screen, since they are public in the repository. No real secrets, `.env` contents or terminal tokens are visible.
- [ ] Captions are in English and readable at 720p.
- [ ] Uploaded as **public** to YouTube or Vimeo (the rules ask for a public URL; whether unlisted counts is unconfirmed, so do not rely on it). The URL opens in a logged-out browser.
- [ ] The URL is pasted into the Innovation Studio project page, the README and [CHECKLIST.md](CHECKLIST.md).

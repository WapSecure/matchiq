# Pitch deck outline

This is an outline of 11 slides with speaker notes. It is the source text for whichever deck format the owner chooses: a PowerPoint file, a hosted slide deck, or slides inside the video. Nothing has been published.

Rules for every slide:

- Use only the numbers in [SUBMISSION.md § Measured results](SUBMISSION.md#measured-results), with their caveats.
- Show synthetic data only, with no Premier League marks, crests or footage.
- Use screenshots from `docs/screenshots/premium/after/` and `docs/screenshots/editorial/`, or fresh captures from the running app.

---

## 1. Title

**MatchIQ: evidence-grounded football intelligence for broadcast and streaming**

- Microsoft × Premier League: Inside the Game
- Synthetic data only; not affiliated with the Premier League
- `github.com/WapSecure/matchiq`

> **Notes:** One line: "MatchIQ turns a synthetic event stream into verified, timed, multilingual match intelligence, and the model never owns a number."

## 2. The problem

- Live coverage needs context in seconds, for many audiences and languages.
- AI can write that context, but one invented statistic on air is a reputational and contractual risk.
- Broadcasters need speed and editorial control, auditability and safe failure.

> **Notes:** Frame the risk, not the hype. The buyer is a producer or head of digital who cannot afford an AI mistake on air.

## 3. The solution in one picture

The five-stage pipeline: Ingest → Interpret → Explain → Render → Personalize. Use the architecture diagram from the README.

> **Notes:** The deterministic engine owns the facts. Agents explain them. The gate decides. Producers control what airs.

## 4. Live studio (screenshot)

The studio in dark or light: scoreboard, 16:9 program preview with a lower third, insight feed, metrics, pitch map.

> **Notes:** A template cue airs immediately. Verified agent copy replaces it when it lands. The product works with AI switched off.

## 5. Explainable by design (screenshot)

The evidence drawer: source events, metric values and definitions, counter-evidence.

> **Notes:** Every claim cites a `metricRef` and event ids. Analysts can check an insight instead of trusting it.

## 6. Multi-agent orchestration

- Match Analyst → Narrative Writer → Fact Checker → Localization → Broadcast Producer, on Microsoft Agent Framework graph workflows.
- A typed state machine with REVISE and REJECT, deadlines, retries and circuit breakers.
- Two independent deterministic checks: the Fact Checker in the agents service and the publish gate in the worker.

> **Notes:** Agents propose and never publish. Show the Observatory screenshot with `ollama` provider rows.

## 7. Failure and recovery, on demand

The Observatory with the "Simulated failure (demo)" badge, for `WRITER_REVISE` or `MODEL_TIMEOUT`.

> **Notes:** Real failures cannot be produced on cue, so demo fault plans are deterministic, clearly labelled and refused in production. Under heavy load, local AI falls back to templates. That is the designed degradation.

## 8. Personalisation

The same insight as Casual, Analyst and Broadcast, in EN, FR, ES and PCM.

> **Notes:** Nigerian Pidgin serves an audience that major products rarely cover. Numbers are identical across all 12 variants, and the checks enforce it. Native-speaker review of the copy is still pending.

## 9. Enterprise-ready controls

- Freeze, retract, suppress, organisation kill switch, audit trail.
- OIDC with six roles, tenant isolation in the API and Postgres RLS.
- Telemetry, OpenAPI 3.1, strict CSP, CodeQL, Trivy and SBOMs, WCAG 2.2 AA checks.

> **Notes:** Each item links to an ADR and tests ([JUDGING_MAP.md](JUDGING_MAP.md)). Say plainly what is not done yet: hosting, Azure deployment, DAST, SCIM.

## 10. Evidence, not claims

| Measure                                     | Result                                                               |
| ------------------------------------------- | -------------------------------------------------------------------- |
| Live session (Ollama `qwen2.5:7b-instruct`) | 222 of 228 narratives agent-written; 0 gate rejections               |
| Localization after PR #40 (10 cases)        | 28% (historical, before 4d977d6) → 87% fully localised; 0 violations |
| CI mock evaluation and attacks              | 46 cases plus 13 attacks; 0 unsupported numbers                      |

> **Notes:** One laptop (M1 Pro), synthetic fixtures, not a cloud benchmark. Microsoft Agent Framework is in use. Foundry, Entra ID and the Azure Bicep are implemented but have not been exercised, because there is no subscription yet.

## 11. Roadmap and ask

1. Public hosted demo.
2. Azure: deploy the Bicep, run Foundry, record a Foundry baseline, switch on Entra ID.
3. Pass difficulty, shot speed, player-focus and favourite-club modes.
4. Licensed data adapters with rights propagation; a design-partner pilot.

> **Notes:** Ask for Azure credits and a broadcast design partner. Close on the promise: one trusted event stream, many audiences, no invented numbers.

---

## Format options (owner decision)

- **PowerPoint (.pptx).** The pptx skill is available in this environment. Use it if the submission form or a partner needs a file.
- **Hosted slide deck.** A Slides artifact type is available. It is private by default and can export to .pptx or PDF.
- **Slides in the video only.** Use slides 1, 3 and 10 as title cards. The video must stay under 2 minutes.

The rules require a project pitch or description (§4.4), not a deck. A deck is optional.

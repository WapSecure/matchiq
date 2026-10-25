# MatchIQ content style guide

This guide covers every word MatchIQ shows to people: labels, buttons, empty states, errors, notifications, accessible names and page titles. It applies to `apps/web` and to any text the API, worker or agents produce that might reach the screen.

The rule behind all of it: **write for the person in front of the screen, in the words they already use.** Our users work in football and broadcasting, not software. Technical depth is welcome, but people have to ask for it.

## 1. Who we write for

| Persona | Where they are | What they need from the words | Voice |
| --- | --- | --- | --- |
| **Broadcast producer and editor** | A live gallery, with seconds to decide | What's on air, what's next, and how to stop it | Short, direct, imperative. Verbs first. No hedging. |
| **Analyst and presenter** | Preparing or talking on air | The insight and the evidence behind it | Precise football vocabulary (xG-style terms, "final third", "pressures"). Numbers with units. No software vocabulary. |
| **Fan and casual viewer** | Watching, often on a phone, in en, fr, es or pcm | A clear story about the match | Warm, plain, one idea per sentence. No abbreviations. |
| **Organisation admin and owner** | Managing people and checking what happened | Who did what, when and why | Neutral, factual, complete sentences. |
| **Engineer and judge** | Evaluating how it works | Model names, versions, timings, raw ids | Technical, **behind a "Technical details" disclosure only**. |

When a screen serves several personas, write for the most time-pressed one (usually the producer) and put the rest behind progressive disclosure.

## 2. Plain-language principles

1. **Say what it means, not how it works.** "Fact-checked" rather than "passed the publish gate". "Standard wording" rather than "deterministic template".
2. **Lead with the outcome.** "Graphic taken off air." Not "Retraction command accepted (202)."
3. **Use football and broadcast words, not software words.** Match, replay, graphic, on air, key moment, half, minute. Avoid session, payload, pipeline, hash, seed, schema, cursor, sequence and revision.
4. **One idea per sentence, about 20 words at most.** Labels are two or three words.
5. **Active voice, present tense.** "The fact checker caught a wrong number." Not "A wrong number was detected."
6. **Never blame the user.** "We couldn't load the matches," not "You made an invalid request."
7. **Be honest about AI and about the demo.** Say clearly when AI wrote something, when standard wording was used, and when a failure was simulated. Never present a test stand-in as a real model.
8. **No raw identifiers on the default view.** Ids, versions, model names, latencies and codes go in Technical details.
9. **Keep accessible names meaningful.** An icon button's name says what it does to what: "Take 'Penbrook level it late' off air", not "Retract".

## 3. Glossary

Use the right-hand column on screen. The left-hand column stays in code, contracts, logs and Technical details.

### Product and match

| Internal term | Say on screen | Notes |
| --- | --- | --- |
| fixture, fixture template | **match** | "Choose a match" |
| fixture lobby | **Matches** | Navigation and page title |
| replay session, session N | **replay**, "Replay 3" | Session ids only in Technical details |
| insight | **key moment** | |
| insight kind | moment type | e.g. "Momentum shift" |
| priority P0 / P1 / P2 | **Major / Notable / Context** | |
| deterministic engine, engine metrics | **match data**, "the stats" | "Every number comes from the match data, never from AI." |
| engine / algorithm version | Technical details only | |
| snapshot | match stats | "Stats appear once play begins." |
| provisional | **Updating** | Hint: "Catching up after a short gap. Figures will settle in a moment." |
| momentum index | **momentum** | Describe in words ("Penbrook on top"); show the score only in the chart table |
| possession basis: time-weighted / event-share proxy | by time on the ball / estimated from events | |
| metric ref (`recoveries.home.rolling5m`) | the metric's name: "Recoveries (home, last 5 min)" | Raw ref in Technical details |
| metric formula | plain definition; formula in Technical details | |
| event sequence, "event 14 of 1470" | **how far through the replay**, "8% through" | |
| seek | **jump ahead** | "You can only jump forward. Use Restart to watch from kick-off." |
| seed, events hash | Technical details only | Explain once: "the same match plays out identically every time" |
| synthetic | **simulated** / **fictional** | See §8 for the legal disclosure |
| ledger | match record | |
| correction event "Voids ev_…" | "Corrects an earlier event" | |

### AI and checks

| Internal term | Say on screen | Notes |
| --- | --- | --- |
| agent narrative, AGENT source | **Written by AI** | Always disclosed |
| template, fallback, TEMPLATE source | **Standard wording** | Pre-written sentences filled with match data. Never "template". |
| publish gate, gate | **fact check** | "Fact-checked ✓" |
| gate rejection | **caught by the fact check** | |
| fact checker agent | fact checker | |
| narrative writer agent | writer | |
| match analyst agent | analyst | |
| localization agent | translator | |
| broadcast producer agent | graphics writer | Avoids clashing with the human producer |
| fallback reason | **why standard wording was used** | Mapped to plain sentences (§3.4) |
| pipeline status (DETECTED, VERIFIED…) | Technical details only | The story replaces it (§3.3) |
| model deployment, prompt version, latency, retries, run id | Technical details only | |
| provider: template / mock / ollama / foundry | Standard wording (no AI) / Test stand-in (not real AI) / AI (local model) / AI (Microsoft Foundry) | Honesty: a mock is never called AI |
| circuit breaker open | "AI paused briefly to recover" | |
| agent observatory | **AI fact-checks** | Tab and page name |
| confidence label high / medium / low | **Strong / Moderate / Limited evidence** | |
| data coverage | **data completeness** | |
| evidence window | **time span** | |
| computed metrics | **stats used** | |
| triggering events | **the plays behind it** | |
| counter-evidence | **what points the other way** | |
| reason code, method version | Technical details only | |

### Broadcast and editorial

| Internal term | Say on screen | Notes |
| --- | --- | --- |
| cue, overlay cue | **graphic** | |
| overlay preview, program preview | **on-air preview** | |
| cue on air / standby | **On air / Standing by** | |
| retract | **take off air** | Button: "Take off air" |
| suppress insight | **drop** a key moment | Button: "Drop"; mark: "Dropped" |
| held (freeze or kill) | **held** | "Held: graphics paused" |
| auto-publish, editorial mode AUTO | **Automatic graphics on** | |
| freeze auto-publish | **pause graphics** | "Pause new graphics for this match" |
| resume auto-publish | **resume graphics** | |
| kill switch | **emergency stop** | Organisation-wide; confirm by typing STOP |
| cue hold / dwell | **minimum time on screen** | "4 s" or "10 s (demo)" |
| overlay revision | update to a graphic | Technical details |
| superseded / expired | replaced / finished | |
| safe area | safe area | Broadcast term producers already use |

### Accounts and activity

| Internal term | Say on screen | Notes |
| --- | --- | --- |
| audit trail | **Activity log** | |
| dotted action keys (`editorial.resumed`) | sentence-case labels ("Graphics resumed") | Raw key in Technical details |
| actor type USER / SERVICE / OPERATOR / SYSTEM / ANONYMOUS | Person / MatchIQ service / Platform operator / Automatic / Signed-out visitor | |
| target type / target id | Item type / Item ID | |
| scope fixture / org | This match / Whole organisation | |
| retention run, sessions purged | Scheduled clean-up, Old replays removed | |
| tenant owner | **Organisation owner** | |
| platform operator | Platform operator | |
| request id | **Reference** | Only for support, small and copyable |

### 3.3 The plain-language story for a key moment

The AI fact-checks page shows each key moment's minute and type, then four labelled facts built from data rather than from raw text. Commentary and the on-screen graphic are always separate facts, because one can be AI-written while the other uses standard wording.

> 18' Goal · Commentary: AI-written · Graphic: Standard wording · Fact check: Passed ✓ · Ready in: 4 languages for 3 audiences

| Fact | Source | Wording |
| --- | --- | --- |
| Commentary | publication | "AI-written" / "Standard wording" / "Being written…" |
| Graphic | overlay revision and editorial state | "AI-written" / "Standard wording" / "Not made yet" / "Taken off air by a producer" / "Held by a producer" / "Dropped by a producer" |
| Fact check | gate report | "Passed ✓" / "Caught 1 problem" / "Pending" |
| Ready in | published narratives | "4 languages for 3 audiences"; the tooltip lists them. Never "12 versions". |

When several moments fall back for the same reason, the page says it once with a count ("9 moments used standard wording because the AI was slow or unavailable"). Each moment keeps only a short reason.

### 3.4 Translating machine text

Strings produced by the agents and the worker (fallback reasons, fact-check notes, demo-failure notes) are **never shown raw** on the default view. The web maps them by pattern or code to sentences in `apps/web/src/constants/observatory.ts`. The original text stays available under Technical details for engineers. If a new reason appears that doesn't match a pattern, the default is "Standard wording was the safer choice here." These sentences follow a "Why standard wording:" label, so they do not repeat it.

| Machine text (examples) | Plain sentence |
| --- | --- |
| `AI_ENABLED=false: deterministic templates only` | AI writing is switched off here. |
| `agents service timed out`, `simulated model timeout` | The AI took too long. |
| `circuit breaker open…` | AI writing paused briefly to recover. |
| `agents service unreachable`, `HTTP 5xx`, `orchestration error` | The AI service was unavailable. |
| `every agent draft failed the publish gate`, `fact checker rejected drafts (…)` | The fact check rejected the AI wording. |
| issue code `UNSUPPORTED_NUMBER` | A number that doesn't match the match data |
| issue code `UNKNOWN_ENTITY` | A player or team that isn't in this match |
| issue code `UNCITED_EVIDENCE` | A claim with no plays to back it up |
| issue code `FORBIDDEN_CLAIM` | Wording we don't allow on air |
| issue code `SCHEMA_VIOLATION` | Text in the wrong shape for a graphic |
| issue code `LENGTH_EXCEEDED` | Too long for the graphic |
| issue code `UNREQUESTED_VARIANT` | A version nobody asked for |

Demo failures are explained as a story, for example: *"We deliberately planted a wrong number to show the safety net. The fact checker caught it and the writer corrected it."*

## 4. Numbers, time and units

- **Match time:** minutes with an apostrophe, `18'`. Stoppage time is `45+2'`. The broadcast clock is `78:41` (mm:ss) only on the scoreboard and graphics.
- **Wall-clock time:** `14:05` in 24-hour time; dates as `23 Oct 2026`. Relative time for recent activity: "2 min ago".
- **Durations:** whole seconds with a space, `4 s` and `30 s`; minutes as `2 min`. Never show milliseconds outside Technical details.
- **Percentages:** whole numbers, `54%`. Use one decimal only where the analyst view needs it.
- **Counts:** digits for 10 and above, and always in stats ("3 shots"). Use thousands separators (`1,470`) and locale formatting for fr/es.
- **Speeds:** `20×`.
- **Ranges:** an en dash with no spaces, `60–75'`.

## 5. Error messages

Every error answers three questions: **what happened, what it means, what to do.** All error copy comes from one place: `humanizeError` in `apps/web/src/lib/errors/`.

| Part | Rule | Example |
| --- | --- | --- |
| Title | What happened, in a few words, with no blame | "We can't reach MatchIQ right now" |
| Explanation | What it means for them, in one or two sentences | "This is usually a brief connection problem." |
| Action | One clear recovery | **Try again** / **Sign in again** / **Go to matches** / **Try again in 23 s** / **Reload** |
| Reference | Only when support might need it: small, copyable, labelled "Reference" | `Reference: req_9f2…` |

**Never show:** stack traces, problem URNs (`urn:matchiq:problem:*`), HTTP status codes, request ids outside "Reference", validation-library output, `Failed to fetch`, `undefined`, `null`, `Error:` or JSON. A guard test enforces this.

| Situation | Title | Action |
| --- | --- | --- |
| Offline | You're offline | Try again (automatic when back online) |
| Network failure | We can't reach MatchIQ right now | Try again |
| Timeout | This is taking longer than usual | Try again |
| Signed out (401) | You've been signed out for security | Sign in again, which returns you to the same page |
| No permission (403) | You don't have access to this | Go to matches |
| Not found (404) | We couldn't find that | Go to matches |
| Conflict (409) | That has already changed | Try again |
| Rejected input (400/422) | That didn't go through | Try again; Reference shown |
| Rate limited (429) | You're going a little fast | Countdown from `Retry-After` (default 30 s) |
| At capacity (503) | MatchIQ is busy right now | Countdown from `Retry-After` |
| Server error (5xx) | Something went wrong on our side | Try again; Reference shown |
| Anything else | Something went wrong | Try again |

**Live stream:** never show an error for a dropped stream. Show a calm "Reconnecting…" banner and resume automatically from the last event. When offline, say "You're offline. Showing the last known score and stats."

**Error boundaries:** when one panel fails, only that panel changes: "This panel couldn't load. The rest of the page still works." The page as a whole never goes blank.

## 6. Empty and loading states

- **Empty states** explain why it's empty and what happens next. Example: "No key moments yet. They appear here as the match unfolds." Never use only "No data".
- **Pre-match and not-ready states** describe when content will appear: "The recap is ready at full time. This page updates by itself."
- **Loading:** use a skeleton with an accessible label, "Loading matches". Don't show a spinner with no text.
- **Unavailable values** say why: "Not tracked in this match", "No attempts yet".

## 7. Capitalisation and punctuation

- **Sentence case** for everything: titles, buttons, tabs and badges. "Take off air", not "Take Off Air".
- Proper nouns keep their case: MatchIQ, Microsoft Foundry, Premier League.
- Buttons are verbs: "Start replay", "Pause graphics", "Try again".
- Use no full stop on labels, buttons or titles, and use one on sentences.
- Use curly apostrophes in copy (`’`) only where the file already does; straight `'` is acceptable in code strings.
- Use the ellipsis character `…` for progress: "Starting…".
- Use a middle dot ` · ` to separate short facts on one line.
- British English spelling (en-GB): organisation, colour, analyse.

## 8. Synthetic-data disclosure (legal)

The disclosure must stay **visible on every page**, in plain words:

> **Simulated match data.** All teams, players and events are fictional and made up for this demo. MatchIQ is not affiliated with or endorsed by the Premier League.

- The studio watermark reads **"Simulated match"** and is never hidden.
- Don't use Premier League marks, club names or real player names anywhere.
- The disclosure is not translated away. In fr, es and pcm views, the English disclosure stays alongside the localized text until a reviewed translation exists.

## 9. Localization (fr, es, pcm)

- **UI chrome is en-GB.** Narratives and graphics are localized by the agents and by standard wording in `fr-FR`, `es-ES` and `pcm-NG`.
- **Numbers never change between languages.** Only the words change. Format with the locale (`54,5 %` in French, `54,5 %` in Spanish).
- **Language names in their own language:** Français, Español, Naijá (Pidgin).
- **Fallback is said plainly, with the language's English name:** "The French version isn't ready yet, so you're seeing English." Mark the fallback text with `lang="en-GB"`.
- **Nigerian Pidgin (pcm):** write how people speak it in football commentary ("Dem don score!"). Keep it respectful and don't caricature it. Have every pcm string reviewed by a fluent speaker before release.
- **French and Spanish:** use the football register of broadcast commentary (fr: « temps fort », « le score » ; es: « jugada clave », « marcador »). Use formal *vous* or *usted* in the UI and the natural commentary voice in narratives.
- Keep strings whole. Don't concatenate translated fragments. Use functions with parameters (`(team) => …`) so word order can change.
- Allow about 30% text expansion for fr and es in layouts.

## 10. Technical details (opt-in depth)

For engineers and judges, each key moment and each evidence panel has a **Technical details** disclosure. It is collapsed by default and holds:

- model provider, deployment name, prompt version, latency, retries and outcome for each agent step
- pipeline status, the raw fallback reason, fact-check issue codes and the raw notes
- raw ids: insight, event, overlay and session, metric refs and formulas, algorithm and method versions, and reason codes

Technical details never contain secrets, prompts or tokens.

## 11. Checklist before merging copy

- [ ] Every new string lives in `apps/web/src/constants/**`.
- [ ] It passes the glossary: no "cue", "insight", "gate", "template", "fixture", "session", "deterministic", "pipeline", "payload" or "ledger" on a default view.
- [ ] Errors use `humanizeError` and never print `error.message` or `problem.detail`.
- [ ] Every loading surface has loading, empty and error states.
- [ ] Accessible names describe the action and its object, and the announced wording is checked in the [manual accessibility checklist](../design/ACCESSIBILITY_CHECKLIST.md).
- [ ] Tests assert on the new strings or on test ids.

## 12. Talking about AI

Disclose once and clearly. Lead with the fact check, which is what customers see.

- **Moment cards** (studio, recap, overlays) carry the badge "Fact-checked". Its description reads "Auto-written from the match data. Every number was checked before it went out." The AI versus standard distinction stays in the data and under Technical details.
- **Standard wording** is labelled only for the Analyst view and on the fact-checks page. Fan and Broadcast cards show no provenance label. Never write "(no AI)".
- **Titles** use "Fact-checks", not "AI fact-checks". The route path does not change.
- **Errors and recovery** describe the outcome, not the AI: "Took too long, so standard wording went out on time", "The writing service was unavailable", "The fact check rejected the draft". Demo-failure explanations may say "the writer", "the draft" or "the fact checker".
- **Stats reassurance** appears once, on the landing page: "Every number comes straight from the match data." Elsewhere say "Every number comes from the match data", with no AI in the sentence.
- **Keep AI explicit** for buyers, judges and settings: the landing hero and description, site metadata, the how-it-works explainer, Technical details, the intro line of the fact-checks page, and model or provider labels such as "AI (local model)" and "AI writing is switched off here".
- **Downloads** (match report) carry one line: "Commentary auto-generated from the match data and fact-checked."

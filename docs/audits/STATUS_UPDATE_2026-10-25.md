# Audit status update, 25 October 2026

The [implementation audit](MATCHIQ_ENTERPRISE_IMPLEMENTATION_AUDIT.md) is a point-in-time record of `dev` at `ed46466` and is not edited. This note records what has changed since. Statuses were checked against merged pull requests and the code on `origin/dev`; "open" means no evidence of a fix exists in the repository.

## Top gaps from the executive summary

| #   | Gap in the audit                                      | Status now    | Evidence and reason                                                                                                                                                        |
| --- | ----------------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Demo video not recorded, Innovation Studio form unset | Open          | Owner actions (REM-04, REM-05). Nothing in the repository can close them.                                                                                                  |
| 2   | No hosted demo; no clean-clone proof                  | Partly closed | CI now boots the Compose app profile from fresh volumes and replays a match (PR #84). Hosting stays an owner decision (ADR-0026); a human clean-clone run is not recorded. |
| 3   | Manual approve-before-air unusable at replay speeds   | Closed        | PR #81: wall-clock approval window, default 45 s, with a countdown.                                                                                                        |
| 4   | Live AI-written share not demonstrated                | Open          | Needs a re-measure on a quiet machine. Development machines are currently out of memory, so the run has not been repeated.                                                 |
| 5   | Foundry and Azure never exercised                     | Open          | No Azure subscription (ADR-0003, ADR-0007). The mock provider is not an integration and is not claimed as one.                                                             |

## P0 remediation tasks

| Task   | Summary                                     | Status        | PRs and notes                                                                                                                                                                |
| ------ | ------------------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REM-01 | Approval window and feed copy               | Closed        | #81 (window, interim feed text, copy fixes). Follow-ups: #83 (commentary controls and interface copy), #85 (plain wording, "in seconds" claim removed).                      |
| REM-02 | Measure live AI-written share               | Open          | Needs a quiet machine; not re-run. The committed 73% baseline is the only recorded figure.                                                                                   |
| REM-03 | Clean-clone run and Compose smoke in CI     | Mostly closed | #84 adds the `compose-smoke` job (run 40127584909). The dated human clean-clone run on a fresh clone is still unrecorded.                                                    |
| REM-04 | Record the demo video                       | Open          | Owner task.                                                                                                                                                                  |
| REM-05 | Submit the Innovation Studio form           | Open          | Owner task; depends on REM-04.                                                                                                                                               |
| REM-06 | Resolve the section 36 credentials conflict | Closed        | #89 and ADR-0025 (accepted): local development accounts kept as a documented exception; a CI guard keeps them out of Azure files.                                            |
| REM-07 | Pitch deck                                  | Open          | Owner builds the Slides deck from the outline; no deck evidence in the repository.                                                                                           |
| REM-08 | Refresh stale submission docs               | Mostly closed | #82 updated CI references, README CI badge, Limitations and Team. The video link remains open (REM-04).                                                                      |
| REM-09 | Missing deferral ADRs                       | Closed        | #82 (ADR-0025 to ADR-0029, ADR-0037, ADR-0023 duplicate renumbered to ADR-0024); #87 (ADR-0038); #88 (ADR-0039).                                                             |
| REM-10 | Shot conversion, pass quality, milestones   | Closed        | #87 and #90. Evidence-envelope fields are populated for milestone insights only; older rules leave them empty (REQ-075 stays partial).                                       |
| REM-11 | Ingest hardening                            | Closed        | #88: clock regressions and impossible period changes answer 422; gaps are returned as warnings. There is no quarantine store; ADR-0039 records the choice.                   |
| REM-12 | Close test gaps                             | Closed        | #86: request-size limit, BFF cross-origin refusal, stale graphics after a seek, connection banner, reduced motion, 360/768/1920 px. Ledger immutability was already covered. |
| REM-13 | Full-stack Playwright smoke                 | Mostly closed | MQ-099 adds the advisory "Browser smoke on the Compose stack" job (browser-level, continue-on-error until it passes cleanly on several dev runs).                            |
| REM-14 | Analyst view sample sizes and comparators   | In progress   | Not merged. Tracked as MQ-089.                                                                                                                                               |
| REM-15 | API alignment                               | Closed        | #88: evidence endpoint, recap persona and lang filters, Idempotency-Key policy stated (ADR-0039).                                                                            |
| REM-16 | Accessibility gate and manual pass          | Partly closed | This change (MQ-090): moderate impact now fails; best-practice findings are logged as warnings; manual checklist written, every row not yet performed.                       |
| REM-17 | Native-speaker review of fr, es, pcm copy   | Open          | External reviewer needed.                                                                                                                                                    |
| REM-18 | Documentation contradictions                | Closed        | #82 (stale docs, traceability, overlay latency, gate wording, ADR-0033 note) and #85 (landing hero claim).                                                                   |

## Still open and why

- **Video and form:** owner actions that depend on the recording.
- **Live AI share:** needs a quiet environment; the current machine is out of memory.
- **Foundry and Azure:** no subscription. Nothing is claimed beyond the mock and local providers.
- **Hosting:** owner decision recorded in ADR-0026; the VPS plan is written but not executed.
- **P2 enterprise items (REM-19 onward):** unchanged and out of scope until the hackathon verdict.

## Traceability changes

`docs/requirements-traceability.csv`: REQ-033 moved from partial to done (the Compose app profile is exercised in CI by #84), and REQ-028 now describes the stricter accessibility gate and remains partial.

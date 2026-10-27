# Submission checklist

Status as of 2026-10-27.

| Date and time                    | Event                                                                                                            |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 2026-10-27 12:00 WAT             | Internal freeze                                                                                                  |
| 2026-10-27 18:00 WAT             | Target submission time (spec §54)                                                                                |
| **2026-10-27 23:59 PT**          | **Hard deadline** (2026-10-28 07:59 WAT)                                                                         |
| 2026-10-27 09:00 PT – 2026-11-20 | Judging period: the repository must stay available. Shortlist about 2026-11-10, winners by 2026-11-20 (spec §37) |

**Sources.**

- **[RULES]**: the [official rules](https://github.com/microsoft/insidethegamehackathon/blob/main/OFFICIAL%20RULES.md), fetched 2026-10-23 (last changed 2026-09-28).
- **[SPEC]**: the master specification, §2, §34 and §54.
- **[NORM]**: common hackathon practice that is not required by the rules.

**Status values.** Done · Open · **Owner decision** · Blocked.

## Required by the rules

| #   | Item                                                                                                            | Source               | Status              | Notes                                                                                                                                                                                                                        |
| --- | --------------------------------------------------------------------------------------------------------------- | -------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | Registered during the registration period                                                                       | RULES §1, §4         | Done                | Confirmed by the owner (spec §2)                                                                                                                                                                                             |
| R2  | Project newly created after the registration period began (2026-09-29)                                          | RULES §4.3           | Done                | Repository created 2026-10-21. First commit 2026-10-21                                                                                                                                                                       |
| R3  | All required fields completed on the Innovation Studio "Projects" page                                          | RULES §4             | Open                | Owner. The exact form fields are unverified (spec §2 open question)                                                                                                                                                          |
| R4  | Project pitch or description: what was built, which Microsoft and Azure technologies, what it does, the problem | RULES §4.4           | Done (draft)        | [SUBMISSION.md § Elevator pitch](SUBMISSION.md#elevator-pitch). Paste it into the form                                                                                                                                       |
| R5  | Demo video under 2 minutes, showing the working project                                                         | RULES §4.4           | Open                | Script: [DEMO_SCRIPT.md](DEMO_SCRIPT.md). **Not recorded.** Owner records it on the recorded model run at Brisk (5×) with the lobby demo failures (updated 27 Oct); the stack and the verified scenarios are in the script   |
| R6  | Public video URL on YouTube, Vimeo, Facebook Video or Youku                                                     | RULES §4.4           | Open                | After R5                                                                                                                                                                                                                     |
| R7  | No third-party trademarks or copyrighted music in the video                                                     | RULES §4.4           | Open                | Checklist in [DEMO_SCRIPT.md](DEMO_SCRIPT.md#recording-checklist)                                                                                                                                                            |
| R8  | Public GitHub repository URL                                                                                    | RULES §4.4           | Done, with a caveat | `https://github.com/WapSecure/matchiq` is public. See R9                                                                                                                                                                     |
| R9  | The repository visibly contains the project                                                                     | RULES §4.4, SPEC §34 | **Decided**         | The repository default branch is now `dev`, so the repository URL shows all the work. `main` holds only the initial commit and is promoted only when the product is complete. Submit `https://github.com/WapSecure/matchiq`. |
| R10 | Access to a working project for judging: website, functioning demo or test build, free, until judging ends      | RULES §4.8           | **Decided**         | No hosted demo until after the verdict. The local setup (README quick-start) is the test build. Judges may also judge from the text, images and video (§4.8). The VPS option in `HOSTING_OPTIONS.md` is deferred.            |
| R11 | Login credentials in the testing instructions if access is private                                              | RULES §4.8           | Done                | The public demo needs no login. Dev-only producer accounts are in the README                                                                                                                                                 |
| R12 | Synthetic, football-realistic data; no footage without rights                                                   | RULES §4.7           | Done                | `libs/synthetic-data`, `fixtures/README.md`. The UI carries a synthetic label                                                                                                                                                |
| R13 | Authorised use of third-party SDKs, APIs and data                                                               | RULES §4.3           | Done                | [`NOTICE`](../../NOTICE). All dependencies are open source. Local Ollama model licence: see NOTICE                                                                                                                           |
| R14 | English materials                                                                                               | RULES §4.9           | Done                | All documents are in English. Non-English narratives are product output                                                                                                                                                      |
| R15 | Original work owned by the entrant                                                                              | RULES §4.6, §4.11    | Done                | MIT `LICENSE`, copyright the owner                                                                                                                                                                                           |
| R16 | Fits at least one category                                                                                      | RULES §4             | **Decided**         | Best Multi-Agent System ([JUDGING_MAP.md](JUDGING_MAP.md#5-adherence-to-hackathon-category-20)).                                                                                                                             |
| R17 | Team of up to four; a Representative if it is a team                                                            | RULES §3, §4.10      | **Decided**         | Solo entry: Orji Joseph Onyedika.                                                                                                                                                                                            |
| R18 | Submitted before 2026-10-27 23:59 PT                                                                            | RULES §1             | Open                | Target 2026-10-27 18:00 WAT. Capture the confirmation                                                                                                                                                                        |

## Required by the spec or good practice

| #   | Item                                                                                | Source              | Status                | Notes                                                                                                                                                     |
| --- | ----------------------------------------------------------------------------------- | ------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1  | README: value, setup, architecture diagram, tests, limitations, provenance, licence | SPEC §19, §34       | Done                  | Rewritten in this change                                                                                                                                  |
| S2  | Licence                                                                             | SPEC §34, §54       | Done, decided         | MIT `LICENSE` (copyright Orji Joseph Onyedika). MIT is the owner decision. A one-line AI-assisted-development note stays in the README and SUBMISSION.md. |
| S3  | NOTICE and third-party licences                                                     | SPEC §34, gap audit | Done (key components) | [`NOTICE`](../../NOTICE) lists the main runtime components. It is not a full transitive inventory: the CI SBOMs are                                       |
| S4  | AI-use disclosure and dataset provenance                                            | SPEC §34            | Done                  | README and [SUBMISSION.md](SUBMISSION.md#ai-use-and-data-disclosure)                                                                                      |
| S5  | Microsoft and Azure services described exactly as used                              | SPEC §19, §36       | Done                  | [SUBMISSION.md § Use of Microsoft technology](SUBMISSION.md#use-of-microsoft-technology)                                                                  |
| S6  | Pitch deck                                                                          | NORM                | **Decided**           | Slides deck built (12 slides). Owner exports .pptx and PDF from the page. Outline: [PITCH_DECK.md](PITCH_DECK.md).                                        |
| S7  | `.env.example` clean; no secrets in the repository                                  | SPEC §15            | Done                  | gitleaks in CI. The demo passwords are dev-only and documented as such                                                                                    |
| S8  | Anonymous check of the repository in a logged-out browser                           | SPEC §34            | Open                  | Default branch is `dev`; check the repository URL                                                                                                         |
| S9  | Incognito test of the demo on desktop and mobile                                    | SPEC §34            | Open                  | No demo URL; run the local setup                                                                                                                          |
| S10 | Repository stays public until judging ends                                          | RULES §4.8, SPEC §2 | Open                  | Repository stays public until judging ends (shortlist 2026-11-10, winners 2026-11-20, spec §37). No hosted demo to keep online.                           |
| S11 | CI green on the submitted commit                                                    | NORM                | Done for `02680d6`    | Re-check on the final commit                                                                                                                              |
| S12 | Fallback tested with the model unavailable                                          | SPEC §15            | Done                  | CI with the model failing; `MODEL_TIMEOUT` scenario; live heavy-load runs                                                                                 |
| S13 | Do not claim Foundry or Azure                                                       | SPEC §36, ADR-0003  | Done                  | Every document labels them as unverified. No Azure credit, so Foundry and Entra stay unexercised (27 Oct)                                                 |

## Owner decisions

Decided:

1. **Branch (R9).** `dev` is the default branch; submit the repository URL.
2. **Hosting (R10, S9, S10).** None until after the verdict. The local setup is the test build. The VPS deploy option is deferred.
3. **Category (R16).** Best Multi-Agent System.
4. **Team (R17).** Solo, Orji Joseph Onyedika.
5. **Deck (S6).** Slides deck, downloadable as .pptx and PDF.
6. **Licence (S2).** MIT. The AI-assisted-development note stays, and so does the "Simulated match" watermark in the on-air preview.

Still open: record and upload the video (R5 to R7), and the final submission (R18).

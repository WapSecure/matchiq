# ADR-0026: No hosted public demo before the verdict; judges run the local stack

- Status: Accepted (owner decision, 2026-10-23). Spec §2, §4 (P0 "public demo"), §34. Recorded by MQ-082 (audit REM-08).

## Context

Spec §4 lists a deployable public demo as P0, §34 asks for a hosted, accessible application, and §2 requires an anonymous demo or test credentials to be supplied for judging. The owner decided on 2026-10-23 not to host anything before the verdict. The approved VPS plan (a small droplet with Compose and Caddy, in `infra/vps`) is authored but not deployed, and there is no Azure subscription in the development phase (ADR-0007).

## Decision

- No hosted public demo is published before the verdict. Judges run the local stack from the README (Option A for the anonymous demo, Option B for sign-in and local AI).
- The submission documents say so plainly, and never imply a live URL. The README table lists the hosted demo as none.
- The VPS and Azure materials stay as authored templates. They are not described as deployed.
- Whether a local build satisfies §2 and rule 4.8 has not been confirmed with the organisers. That risk is recorded in `docs/submission/CHECKLIST.md`.

## Consequences

- Judges need Docker, and Node and Ollama for Option B. The README gives a five-minute path and states its caveats.
- Requirement REQ-035 stays DEFERRED-OWNER in `docs/requirements-traceability.csv`.
- Hosting can be added later without code changes, subject to ADR-0025 (credentials) and ADR-0003 (nothing claimed until exercised).

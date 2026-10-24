# ADR-0025: Local development credentials are published for the local realm only

- Status: Proposed, owner to confirm (2026-10-24). Spec §36, §40. Recorded by MQ-082 (audit REM-06).

## Context

Spec §36 says demo credentials are recorded only in secure configuration and never in the public repository. The README lists eight synthetic Keycloak accounts and their shared password, `matchiq-dev-only`, and the same value sits in `infra/keycloak/matchiq-realm.json`. The judge quick-start (README, Option B) depends on those accounts, because judges sign in to try the producer, analyst and operator roles. The audit (`docs/audits`) flagged the literal conflict with §36.

## Decision

- The password and accounts are for the local development realm only. They guard no real data: every organisation, club and player is synthetic.
- The sign-in page labels the accounts "Development only" (`apps/web/src/constants/auth.ts`), and the README says the same.
- `infra/keycloak/matchiq-realm.json` is mounted only by the local `docker-compose.yml`. It is not used by the VPS overlay, the Azure templates or any other hosted environment.
- Any hosted deployment must create its own realm or tenant, with generated secrets held in a secret manager, and must not import this realm file.
- The README keeps the credentials, because removing them would break the judge quick-start. This is a conscious, documented exception to §36, not a claim that §36 is met.

## Consequences

- Anyone can sign in to a local stack they run themselves. That is the intended behaviour.
- If a hosted demo is ever approved (ADR-0026), the credentials in this ADR cannot be reused there.
- If the owner rejects this exception, the alternative is to generate per-run passwords in a setup script and print them to the terminal. That removes the published value but adds a step to the judge path.

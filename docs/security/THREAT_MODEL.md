# Threat model

STRIDE over the deployed MatchIQ architecture (spec §48). It covers what runs today plus the OIDC sign-in that is landing (ADR-0015). Each threat maps to a mitigation and the evidence for it: **[test]** is an automated test, **[ci]** is a CI gate, **[config]** is configuration under review, and **[planned]** is not implemented. MatchIQ makes no compliance claims.

Owner for every row: the platform team (`.github/CODEOWNERS`). Review this document whenever a trust boundary changes (a new service, ingress, identity provider or data source).

## System and trust boundaries

```
 Browser ──HTTPS──▶ Caddy (VPS) / Container Apps ingress
   │                  ├─▶ web  (Next.js, UI only, no secrets in the bundle)
   │                  └─▶ api  (NestJS: authoritative writes, ingest, replay, SSE)
   │                           │  Postgres (ledger, outbox, audit, RLS)   Redis (BullMQ, pub/sub)
   │                           ▼
   │                       worker (projection, moments, deterministic publish gate, overlays)
   │                           │  internal network + AGENTS_SERVICE_TOKEN
   │                           ▼
   │                       agents (FastAPI, stateless proposals) ──▶ model provider (mock / Ollama / Foundry)
   └──OIDC──▶ identity provider (Keycloak locally :8180, Entra ID planned)
```

| Boundary | Crosses it                      | Trust                                     |
| -------- | ------------------------------- | ----------------------------------------- |
| B1       | Internet → web and api          | Untrusted; anonymous demo or OIDC bearer  |
| B2       | api/worker → Postgres and Redis | Private network, credentials from env     |
| B3       | worker → agents                 | Internal ingress, shared service token    |
| B4       | agents → model provider         | Outbound; model output is untrusted       |
| B5       | Browser ↔ identity provider     | Standard OIDC; tokens verified by the api |
| B6       | CI → images and dependencies    | Third-party code entering the build       |

## Threats and mitigations

### Spoofing

| #   | Threat                                                   | Mitigation                                                                                                       | Evidence                                                                            |
| --- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| S1  | Caller impersonates an operator or producer              | JWT verified against the issuer JWKS (`iss`, `aud`, expiry, asymmetric algorithms only); deny by default         | **[test]** `libs/auth`, `apps/api/src/app/auth/*.spec.ts`; `IDENTITY_AND_ACCESS.md` |
| S2  | Leaked shared operator key used from anywhere            | `AUTH_OPERATOR_KEY_ENABLED` is off by default and refused when `APP_ENV=prod`; 32-byte minimum                   | **[test]** `libs/config/src/lib/auth-env.spec.ts`                                   |
| S3  | Something other than the worker calls the agents service | Service token compared in constant time; internal ingress only                                                   | **[test]** `apps/agents/tests`; **[config]** `infra/azure/modules/apps.bicep`       |
| S4  | Forged event batches on ingest                           | Ingest requires `events:ingest`; strict schemas; idempotent event IDs and canonical hashes reject changed bodies | **[test]** api ingest integration specs                                             |
| S5  | Phishing page frames MatchIQ to capture clicks           | `frame-ancestors 'none'` and `X-Frame-Options: DENY` on web and api                                              | **[test]** `apps/web-e2e/src/security-headers.spec.ts`, `http-kit.spec.ts`          |

### Tampering

| #   | Threat                                           | Mitigation                                                                                                   | Evidence                                                                        |
| --- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| T1  | Injected script alters the studio or on-air cues | Nonce + `strict-dynamic` CSP with a hashed theme bootstrap; no `unsafe-inline`/`unsafe-eval` scripts in prod | **[test]** `csp.spec.ts`; **[test]** e2e asserts zero CSP violations per screen |
| T2  | Model output invents statistics or evidence      | Agents only propose; the worker's deterministic gate checks `metricRef`/`eventIds` against the engine        | **[test]** worker publish-gate specs; `AI_AGENT_GOVERNANCE.md`                  |
| T3  | Prompt injection through event metadata          | Metadata is isolated as data in prompts; outputs schema-validated; unknown fields rejected                   | **[test]** agents contract tests                                                |
| T4  | Editorial history rewritten                      | Append-only `audit_events` (trigger refuses UPDATE/DELETE)                                                   | **[test]** `audit.integration.spec.ts`                                          |
| T5  | Outbox or Redis messages altered in transit      | Redis and Postgres are reachable only on the private network; SSE payloads come from committed outbox rows   | **[config]** `compose.vps.yml` binds only Caddy publicly                        |
| T6  | Malicious dependency or base image               | Exact pins, lockfiles, SHA-pinned actions, dependency review, `pnpm audit`, `pip-audit`, Trivy, CodeQL       | **[ci]** `ci.yml` jobs listed in `SECURITY_STANDARDS.md`                        |

### Repudiation

| #   | Threat                                           | Mitigation                                                                      | Evidence                                   |
| --- | ------------------------------------------------ | ------------------------------------------------------------------------------- | ------------------------------------------ |
| R1  | A producer denies publishing or retracting a cue | Every editorial action and automated block writes an actor-attributed audit row | **[test]** `editorial.integration.spec.ts` |
| R2  | Requests cannot be correlated across services    | Request IDs propagated and validated; structured logs                           | **[test]** `http-kit.spec.ts`              |

### Information disclosure

| #   | Threat                                     | Mitigation                                                                                            | Evidence                                                     |
| --- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| I1  | Cross-tenant reads (IDOR)                  | Organisation taken only from the token; tenant-scoped queries; Postgres RLS lands with MQ-025         | **[test]** `libs/access`; **[planned]** RLS suite (ADR-0015) |
| I2  | Stack traces or secrets in errors and logs | RFC 9457 problems hide internals; env errors name variables, never values                             | **[test]** `http-kit.spec.ts`, `libs/config`                 |
| I3  | Secrets committed to the public repository | gitleaks over reachable history; GitHub secret scanning and push protection                           | **[ci]** `security` job                                      |
| I4  | Cross-origin reads of API data             | CORS allowlist of exact origins (wildcards and paths rejected at startup); CORP `same-origin`         | **[test]** `load-env.spec.ts`, `http-kit.spec.ts`            |
| I5  | Exfiltration from an injected script       | `connect-src` limited to self, the API origin and the OIDC issuer; `form-action` likewise             | **[test]** `csp.spec.ts`, e2e                                |
| I6  | Referrer or window-handle leaks            | `Referrer-Policy: strict-origin-when-cross-origin`; COOP `same-origin`                                | **[test]** e2e                                               |
| I7  | Prompt data sent to an external model      | Local-first providers (mock, Ollama); Foundry only via managed identity and never claimed unexercised | ADR-0003, ADR-0012                                           |

### Denial of service

| #   | Threat                              | Mitigation                                                                        | Evidence                                     |
| --- | ----------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------- |
| D1  | Replay or read endpoints flooded    | Per-client rate limits (stricter on replay controls), trusted-proxy aware         | **[test]** `trust-proxy.integration.spec.ts` |
| D2  | Too many concurrent replay sessions | Session capacity limits and retention                                             | ADR-0015 (replay capacity)                   |
| D3  | Model provider slow or down         | Bounded job concurrency, retries with backoff, circuit breaker, mock fallback     | **[test]** worker pipeline specs             |
| D4  | SSE connections exhaust the api     | Heartbeats, short-lived stream tickets with OIDC, Caddy flushes without buffering | **[config]** `Caddyfile`; identity docs      |

### Elevation of privilege

| #   | Threat                                           | Mitigation                                                                                    | Evidence                                      |
| --- | ------------------------------------------------ | --------------------------------------------------------------------------------------------- | --------------------------------------------- |
| E1  | Anonymous demo user performs editorial writes    | Anonymous role is read-only apart from replay controls; one permission per route              | **[test]** `libs/access/tests/matrix.spec.ts` |
| E2  | Token `scope` widens a role                      | Effective permissions are the intersection of role and scope                                  | **[test]** `libs/access`                      |
| E3  | Compromised CI step escalates via `GITHUB_TOKEN` | Workflow-level `permissions: {}`; each job requests only what it uses; actions pinned to SHAs | **[ci]** `ci.yml`, CodeQL `actions` analysis  |
| E4  | Container breakout from a vulnerable image       | Non-root users, slim pinned base images, Trivy gate on fixable high/critical CVEs             | **[ci]** `Container image (*)` jobs           |

## Residual risks

- `style-src-attr 'unsafe-inline'` is allowed because React renders `style` attributes on the server. Inline `<style>` elements still need the nonce. CSS injection could restyle a page but cannot run script.
- The CSP nonce forces every page to render per request, so pages are not statically cached. That is acceptable at demo scale.
- No Trusted Types (`require-trusted-types-for`) yet: Next and React do not fully support it.
- No CSP reporting endpoint. Violations are caught by the e2e suite, not in production.
- CodeQL and Trivy gate only on high or critical findings; medium findings are visible in code scanning and logs but do not block a merge.
- SBOMs are CI artifacts only. They are not signed or attached to releases yet, and images are not signed (no provenance attestation).
- Runtime images run `apt-get upgrade` at build time, so two builds of one commit can differ in OS patch level. The SBOM records what shipped.
- No DAST against staging and no penetration test (spec §48 expects both before a commercial launch).
- The worker → agents service token is a shared secret, not workload identity. It is rotated manually.
- Redis has no authentication on the private compose network. Isolation depends on the network.
- Until OIDC sign-in ships in the web app, operator access depends on the shared key in dev and CI.

## Related

[`SECURITY_STANDARDS.md`](../engineering/SECURITY_STANDARDS.md), [`IDENTITY_AND_ACCESS.md`](IDENTITY_AND_ACCESS.md), [`AI_AGENT_GOVERNANCE.md`](../engineering/AI_AGENT_GOVERNANCE.md), [`SECURITY.md`](../../SECURITY.md).

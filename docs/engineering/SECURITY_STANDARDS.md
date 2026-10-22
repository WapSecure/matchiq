# Security Standards

Reference: OWASP ASVS 5.0. MatchIQ makes **no compliance or certification claims**.

## Access model

| Surface                                                      | Access                                                                                                                                  |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Demo read APIs, SSE stream, replay controls                  | Anonymous demo principal (`AUTH_ANONYMOUS_DEMO_ENABLED`): read-only apart from rate-limited replay controls, in `AUTH_ANONYMOUS_ORG_ID` |
| Everything else (fixture creation, ingest, editorial, audit) | OIDC access token (`Authorization: Bearer`), role permissions per `docs/security/IDENTITY_AND_ACCESS.md`                                |
| SSE without headers                                          | Short-lived signed stream ticket (`?ticket=`), bound to one fixture and organisation                                                    |
| Dev/CI fallback                                              | `OPERATOR_API_KEY` behind `AUTH_OPERATOR_KEY_ENABLED`, refused when `APP_ENV=prod`                                                      |
| Worker → agents                                              | Shared service token (`AGENTS_SERVICE_TOKEN`) and internal ingress only                                                                 |

Authorization is deny-by-default and enforced server-side (ADR-0015): every route declares one permission with `RequirePermission` or is `@PublicRoute` (health), and a test fails otherwise. 401 for missing or invalid credentials, 403 without the permission, non-disclosing 404 across tenants. The organisation comes only from the verified principal. Postgres row-level security backs every tenant table (a test fails if a table with `org_id` has no policy). Privileged actions, denials, sign-in and sign-out are recorded with the real actor in the append-only `audit_events` table.

## Baseline controls (implemented)

- Helmet security headers, CORS allowlist from `CORS_ALLOWED_ORIGINS` (default deny), and `x-powered-by` removed. Covered by **[test]** `libs/server-kit/src/lib/http-kit.spec.ts`.
- RFC 9457 problem responses that never include stack traces or internal messages. Covered by **[test]**.
- Request IDs: a valid inbound ID is propagated, a malformed one is replaced.
- Environment validation fails fast, and error messages name variables without echoing their values. Covered by **[test]** `libs/config`.
- Web: `poweredByHeader: false`, `X-Frame-Options: DENY`, `nosniff`, a referrer policy, and a restrictive `Permissions-Policy`.
- Agents: mock provider is rejected in `prod`, API docs are disabled, and unknown payload fields are rejected.

## Secrets

- Secrets are never committed. `.env*` is ignored, except `.env.example`, which holds placeholders only. **[ci]** gitleaks scans all history reachable from the commit under test, using `.gitleaks.toml`. Allowlist entries must be narrowly scoped (path, variable pattern) and justified, and real-looking secrets must still be caught.
- Azure uses managed identity and Key Vault, with no model API keys. Locally, `az login` provides credentials.
- Logs must not contain secrets, tokens, connection strings or raw licensed payloads.

## Untrusted input and AI

- Every external payload is validated by a strict Zod or Pydantic model. Unknown fields are rejected.
- Event metadata is data, not instructions. Prompts isolate it, and outputs are schema-validated and checked against the evidence allowlist before publication (see `AI_AGENT_GOVERNANCE.md`).

## Supply chain

- Exact dependency pins and committed lockfiles. GitHub Actions are pinned to commit SHAs.
- **[ci]** `pnpm audit --prod --audit-level=high` and `pip-audit --strict` block merge on high or critical advisories.

## Cloud

No paid Azure resources are provisioned and no cloud permissions are changed without explicit owner approval.

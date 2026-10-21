# Security Standards

Reference: OWASP ASVS 5.0. MatchIQ makes **no compliance or certification claims**.

## Access model

| Surface                                                                      | Access                                                                     |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Demo read APIs, SSE stream, web UI                                           | Anonymous, read-only, scoped to the synthetic demo organisation            |
| Replay controls exposed to judges                                            | Anonymous, rate-limited, idempotent                                        |
| Operator and admin actions (fixture creation, approvals, retraction, config) | `Authorization: Bearer <OPERATOR_API_KEY>`. Entra ID is planned (ADR-0010) |
| Worker → agents                                                              | Shared service token (`AGENTS_SERVICE_TOKEN`) and internal ingress only    |

Authorization is deny-by-default and enforced server-side. Tenant identity comes from the auth context, never from client input. See ADR-0007 for what tenancy is and is not claimed.

## Baseline controls (implemented)

- Helmet security headers, CORS allowlist from `CORS_ALLOWED_ORIGINS` (default deny), and `x-powered-by` removed. Covered by **[test]** `libs/server-kit/src/lib/http-kit.spec.ts`.
- RFC 9457 problem responses that never include stack traces or internal messages. Covered by **[test]**.
- Request IDs: a valid inbound ID is propagated, a malformed one is replaced.
- Environment validation fails fast, and error messages name variables without echoing their values. Covered by **[test]** `libs/config`.
- Web: `poweredByHeader: false`, `X-Frame-Options: DENY`, `nosniff`, a referrer policy, and a restrictive `Permissions-Policy`.
- Agents: mock provider is rejected in `prod`, API docs are disabled, and unknown payload fields are rejected.

## Secrets

- Secrets are never committed. `.env*` is ignored, except `.env.example`, which holds placeholders only. **[ci]** gitleaks scans the full history.
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

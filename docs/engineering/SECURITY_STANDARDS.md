# Security Standards

Reference: OWASP ASVS 5.0. MatchIQ makes **no compliance or certification claims**. Threats and residual risks are in [`docs/security/THREAT_MODEL.md`](../security/THREAT_MODEL.md); disclosure is in [`SECURITY.md`](../../SECURITY.md).

## Access model

| Surface                                                                      | Access                                                                     |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Demo read APIs, SSE stream, web UI                                           | Anonymous, read-only, scoped to the synthetic demo organisation            |
| Replay controls exposed to judges                                            | Anonymous, rate-limited, idempotent                                        |
| Operator and admin actions (fixture creation, approvals, retraction, config) | `Authorization: Bearer <OPERATOR_API_KEY>`. Entra ID is planned (ADR-0010) |
| Worker → agents                                                              | Shared service token (`AGENTS_SERVICE_TOKEN`) and internal ingress only    |

Authorization is deny-by-default and enforced server-side. New operator routes declare a permission scope with `RequirePermission` (401 without valid credentials, 403 without the scope). The shared key resolves to an operator holding every scope until OIDC replaces the resolver (ADR-0016). Editorial actions and every automated block are recorded in the append-only `audit_events` table. Tenant identity comes from the auth context, never from client input. See ADR-0007 for what tenancy is and is not claimed.

## Baseline controls (implemented)

- API and worker: Helmet headers with a JSON-only CSP (`default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`), `X-Frame-Options: DENY`, HSTS, `nosniff`, CORP `same-origin`, and no `x-powered-by`. A service that serves HTML (for example API docs) passes its own `contentSecurityPolicy` to `configureHttpApp`. Covered by **[test]** `libs/server-kit/src/lib/http-kit.spec.ts`.
- CORS: allowlist from `CORS_ALLOWED_ORIGINS`, default deny, no credentials. Each entry must be an exact `http(s)://host[:port]` origin; wildcards, paths and `null` fail startup. Covered by **[test]** `libs/config/src/lib/load-env.spec.ts`.
- RFC 9457 problem responses that never include stack traces or internal messages. Covered by **[test]**.
- Request IDs: a valid inbound ID is propagated, a malformed one is replaced.
- Environment validation fails fast, and error messages name variables without echoing their values. Covered by **[test]** `libs/config`.
- Web: see [Web content security policy](#web-content-security-policy). Static headers live in `apps/web/next.config.js`: `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, a deny-all `Permissions-Policy`, COOP and CORP `same-origin`, and HSTS (`max-age=31536000; includeSubDomains`) in production builds. `poweredByHeader` is off. `/sw.js` keeps its own `default-src 'self'` policy.
- Edge: Caddy (`infra/vps/Caddyfile`) adds HSTS and `nosniff` and strips `Server`.
- Agents: mock provider is rejected in `prod`, API docs are disabled, and unknown payload fields are rejected.

## Web content security policy

`apps/web/src/proxy.ts` sets a fresh policy on every page request, built by `apps/web/src/lib/security/csp.ts`:

```
default-src 'self'; script-src 'self' 'nonce-<per request>' 'strict-dynamic' 'sha256-<theme script>';
script-src-attr 'none'; style-src 'self' 'nonce-<per request>'; style-src-attr 'unsafe-inline';
img-src 'self' data: blob:; font-src 'self'; connect-src 'self' <API origin> [<OIDC issuer origin>];
worker-src 'self'; manifest-src 'self'; media-src 'self'; frame-src 'none'; object-src 'none';
base-uri 'none'; form-action 'self' [<OIDC issuer origin>]; frame-ancestors 'none'
[; upgrade-insecure-requests when the API origin is HTTPS]
```

- Next's App Router streams inline scripts, so a hash alone cannot work. Next reads the nonce from the request's CSP header and stamps it on its scripts. The root layout calls `connection()` so every page renders per request.
- The no-flash theme bootstrap (`lib/theme/theme-script.ts`) is a string literal. It is allowed by its SHA-256, computed from that same constant, so the hash cannot drift from the bytes the layout renders.
- `connect-src` takes the origin of `NEXT_PUBLIC_API_BASE_URL` (build time) and of `OIDC_ISSUER_URL` (read at runtime by the web server, so one image can use Keycloak on :8180 locally or Entra ID). The issuer is also allowed in `form-action` for sign-in redirects. That is the seam for new origins: add an env-driven origin in `page-policy.ts`, never a wildcard.
- `next dev` uses the same policy plus `'unsafe-eval'` (React's dev stack frames) and `ws:`/`wss:` (HMR). Production never has either; **[test]** `csp.spec.ts` checks this.
- **[test]** `apps/web-e2e/src/security-headers.spec.ts` runs against the production build on every screen, in system, light and dark themes, on desktop and mobile. It fails on any `securitypolicyviolation` event or console error.

## Secrets

- Secrets are never committed. `.env*` is ignored, except `.env.example`, which holds placeholders only. **[ci]** gitleaks scans all history reachable from the commit under test, using `.gitleaks.toml`. Allowlist entries must be narrowly scoped (path, variable pattern) and justified, and real-looking secrets must still be caught.
- Azure uses managed identity and Key Vault, with no model API keys. Locally, `az login` provides credentials.
- Logs must not contain secrets, tokens, connection strings or raw licensed payloads.

## Untrusted input and AI

- Every external payload is validated by a strict Zod or Pydantic model. Unknown fields are rejected.
- Event metadata is data, not instructions. Prompts isolate it, and outputs are schema-validated and checked against the evidence allowlist before publication (see `AI_AGENT_GOVERNANCE.md`).

## Supply chain

- Exact dependency pins and committed lockfiles. Third-party GitHub Actions are pinned to full commit SHAs with the version in a comment. The Trivy binary is downloaded at a pinned version and its SHA-256 is verified (`.github/scripts/install-trivy.sh`).
- `GITHUB_TOKEN`: the CI workflow grants nothing at the top level (`permissions: {}`). Each job requests only what it uses: `contents: read`, plus `security-events: write` and `actions: read` for CodeQL.
- Every job in `ci.yml` must succeed before a PR merges. The CI gates are:

| Job                                               | Blocks on                                                                                                                                   |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `Secrets and dependency audit`                    | gitleaks findings; `pnpm audit --prod --audit-level=high`; `pip-audit --strict`                                                             |
| `Dependency review` (PRs)                         | A PR that adds a dependency with a high or critical advisory (runtime or development scope)                                                 |
| `CodeQL (javascript-typescript, python, actions)` | Unsuppressed results with security-severity ≥ 7.0 (`security-extended` queries); all results go to code scanning                            |
| `Container image (api, worker, web, agents)`      | Trivy: fixable HIGH or CRITICAL CVEs in the image. Also uploads a CycloneDX SBOM artifact `sbom-<app>`                                      |
| `IaC and filesystem scan`                         | Trivy misconfigurations (HIGH/CRITICAL) in Dockerfiles, compose, `infra/` and the Bicep compiled to ARM; fixable HIGH/CRITICAL in lockfiles |

### Container and IaC scanning

- Exceptions go in `.trivyignore.yaml` only. Each entry needs the finding id, the narrowest paths, a `statement` explaining why it is not exploitable here, and an `expired_at` no more than 90 days out, so it fails again when it expires. A PR that adds an entry needs owner review.
- Never lower a severity threshold, drop `--exit-code 1`, or skip a directory to get a build green. Fix the finding, upgrade the base image, or record a justified, expiring exception.
- SBOMs are kept for 30 days as workflow artifacts. Attaching them to GitHub releases, and signing images and SBOMs, is planned for when release tagging starts.

## Cloud

No paid Azure resources are provisioned and no cloud permissions are changed without explicit owner approval.

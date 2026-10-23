# ADR-0018: Identity, authorisation and tenant isolation

- Status: Accepted (2026-10-22). Delivered in stages: libraries and Keycloak first, then API enforcement with RLS, then web sign-in. Supersedes ADR-0010 and the enforcement parts of ADR-0007 (the tenant-ready schema it describes stays). Implements spec §40, §45 (scopes), §48 (IDOR, token theft, editorial tampering) and invariant I2.

## Context

Until now every caller shared one bearer key (`OPERATOR_API_KEY`) and every query used `DEMO_ORG_ID`. Spec §40 requires OIDC sign-in, the six product roles, tenant scoping from the auth context, non-disclosing cross-tenant lookups and audit of privileged actions. Spec §40 also keeps an anonymous, read-only demo tenant for judges. The owner chose a provider-neutral OpenID Connect integration: Keycloak locally (self-hosted, free) and Microsoft Entra ID later, by configuration only.

## Decision

### Identity

- The API is an OAuth 2.0 resource server. It accepts `Authorization: Bearer <JWT access token>` and verifies it with `jose`: signature against the issuer's JWKS (fetched from `OIDC_JWKS_URL` or the discovery document, cached, refetched on an unknown `kid` with a cooldown), `iss` = `OIDC_ISSUER_URL`, `aud` contains `OIDC_AUDIENCE`, `exp`/`nbf`/`iat` with `OIDC_CLOCK_SKEW_SECONDS` tolerance, asymmetric algorithms only (`RS256`, `PS256`, `ES256`). `alg: none` and HMAC tokens are rejected.
- Claims map to `Principal { userId, orgId, roles, scopes, displayName, kind }`. Claim names are configuration (`OIDC_ORG_CLAIM`, `OIDC_ROLES_CLAIM`, `OIDC_NAME_CLAIM`), so the same code accepts Keycloak (`org`, `roles` from client-role mappers) and Entra ID (app roles in `roles`, the organisation from a directory extension or claims-mapping policy). A token without a valid organisation or with no known role is rejected with 401: an identity without a tenant has no access.
- Roles and permissions live in the framework-free `libs/access` (`scope:shared`, `type:domain`), shared by the API and the web UI. `libs/auth` (`scope:server`, `type:data-access`) holds the token verifier, stream tickets and the Nest adapter (guards, `@RequirePermission`, `@CurrentPrincipal`, 401/403 problems).
- The web app is a confidential-capable OIDC relying party (Authorization Code + PKCE S256, `state`, `nonce`) using `openid-client`. Tokens never reach browser JavaScript: they live server-side in an encrypted, httpOnly, `SameSite=Lax` session cookie, and the web server forwards API calls as a backend-for-frontend (BFF) with the bearer token. Sign-out clears the cookie and calls the provider's end-session endpoint.

### Authorisation

Roles are the spec §40 names. Permissions are the spec §45 scopes plus the ones the product needs (`replay:control`, `agents:traces:read`, `audit:read`). The matrix is defined once in `libs/access/src/lib/matrix.ts` and documented in `docs/security/IDENTITY_AND_ACCESS.md`.

- Deny by default: every API route declares exactly one permission with `@RequirePermission`, or is explicitly `@PublicRoute` (health only). A route with neither is rejected at request time with 403, and a unit test walks every controller to assert the declaration.
- Effective permissions are the union of the principal's role permissions. If the token's `scope` claim names any MatchIQ permission, the effective set is narrowed to the intersection (a client can down-scope a user, never escalate).
- 401 (`urn:matchiq:problem:unauthorized`, with `WWW-Authenticate: Bearer error=...`) for a missing, malformed, expired, wrong-issuer, wrong-audience or badly signed token. 403 (`urn:matchiq:problem:forbidden`) for a valid principal without the permission. Cross-tenant resources answer the same non-disclosing 404 as missing ones.

### Tenancy

- The organisation comes only from the principal. Services receive `orgId` from `@CurrentPrincipal()`, never from `DEMO_ORG_ID`, the path or the body.
- Defence in depth with Postgres row-level security. Every tenant table has RLS enabled with a policy `org_id = current_setting('app.org_id', true)` for reads and writes. Tenant work runs in a transaction that first executes `set_config('app.org_id', <org>, true)` and `set_config('role', 'matchiq_app', true)`. `matchiq_app` is a `NOLOGIN`, non-owner, non-`BYPASSRLS` role with only DML grants, and `audit_events` is append-only for it (no `UPDATE`/`DELETE`). A transaction pins itself to the first organisation it sees and refuses a second, so a bug cannot mix tenants within one unit of work.
- Cross-tenant system work runs as the connecting owner role without `matchiq_app`: migrations, template seeding, the outbox relay (it copies rows already written under RLS to org-namespaced Redis channels) and the worker's session resume scan. These are the only call sites, and they are named `system*`.
- The worker reads `orgId` from each job (`ReplayCommandJob`, `InsightJob`) and every pipeline transaction pins to it.
- A test fails if any table with an `org_id` column lacks RLS or a policy, so new tables cannot skip it.

### Streams

`EventSource` cannot send headers, so the API offers short-lived signed **stream tickets**: `POST /api/v1/fixtures/:id/stream-tickets` (requires `fixtures:read`) returns an HS256 JWT signed with `STREAM_TICKET_SECRET`, bound to the user, organisation and fixture, valid for `STREAM_TICKET_TTL_SECONDS` (default 60). `GET /fixtures/:id/stream` accepts a bearer token or `?ticket=`. A ticket opens one fixture's stream only; an open stream outlives the ticket, and every reconnect asks for a new one. Tickets are not single-use, so a leaked ticket is usable until it expires; the TTL bounds that. We chose tickets over a cookie because the API and web are different origins and the API stays stateless.

### Anonymous demo and the judge path

- `AUTH_ANONYMOUS_DEMO_ENABLED` (default `false`; `true` in `.env.example` and the hosted demo) admits requests **without** an `Authorization` header as the built-in `anonymous` principal of `AUTH_ANONYMOUS_ORG_ID`. Its permissions are fixed: read published outputs and agent traces, and control replays (rate-limited). It cannot create fixtures, ingest, read audit or use editorial controls. A request with an invalid token is never downgraded to anonymous.
- The web login page shows a clearly labelled "Demo accounts" panel only when `NEXT_PUBLIC_DEMO_MODE=true`. Each account starts the normal OIDC flow with `login_hint`; the dev-only passwords are printed on the panel and in the docs. Passwords are never auto-submitted and no password grant is enabled. Judges can still use everything anonymously, and the panel lets them see role gating in two clicks.

### Machine-to-machine

- Worker → agents keeps the shared service token on internal ingress (unchanged).
- `OPERATOR_API_KEY` remains only as a dev/CI fallback behind `AUTH_OPERATOR_KEY_ENABLED` (default `false`). The schema rejects `true` when `APP_ENV=prod`. The key maps to a `developer` + `producer` principal in `AUTH_OPERATOR_KEY_ORG_ID`, and audit rows name it `operator-key`. Machine clients in production use OAuth client credentials with the same roles.

### Audit

Privileged actions write `audit_events` with the real actor (`userId`), its type (`USER`, `SERVICE`, `OPERATOR` for the dev/CI key, `ANONYMOUS`, `SYSTEM`), organisation, request ID and the actor's roles: fixture creation, ingest, replay session creation and commands, the editorial actions of ADR-0016, sign-in and sign-out (recorded by the BFF through `POST /api/v1/me/sign-in` and `/sign-out`), and every 403 for an authenticated principal. Stream tickets are not audited: they are read access and are reissued on every reconnect.

The editorial `ACTOR_RESOLVER` seam of ADR-0016 is replaced by this principal: `actorFromPrincipal` adapts it to the editorial `Actor`, and `RequirePermission` is the single declaration both use.

`DEMO_ORG_ID` remains only as the default seed tenant and the organisation of platform-level worker audit rows (retention runs); no request is scoped by it.

## Alternatives considered

- **Opaque tokens with introspection.** One network round trip per request and a hard IdP dependency; JWT with JWKS caching keeps the API available during short IdP outages.
- **Tokens in browser storage.** Simpler, but any XSS steals them. The BFF keeps them server-side.
- **A session cookie for SSE.** Needs a shared parent domain or a same-origin proxy holding long-lived streams in the web tier.
- **Application-only tenant checks.** Required anyway; RLS catches a forgotten `WHERE org_id`.
- **`FORCE ROW LEVEL SECURITY` for the owner.** Would also block migrations, the relay and seeding; a separate non-owner role is the common pattern.

## Consequences

- MatchIQ can claim "tenant isolation enforced in the application and by Postgres RLS, covered by cross-tenant tests". It does not claim SCIM provisioning, organisation self-service, membership revocation faster than the access token lifetime (5 minutes in the dev realm), or any certification.
- Every new tenant table needs an RLS policy in its migration (enforced by test), and every new route a permission (enforced by test).
- Production must connect as a role that may `SET ROLE matchiq_app` (the migration grants it to the migrating role); connecting as a superuser still works because the role switch drops superuser privileges for the transaction.
- Entra ID needs only environment changes; see `docs/security/IDENTITY_AND_ACCESS.md`.

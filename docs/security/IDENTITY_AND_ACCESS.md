# Identity and access

How MatchIQ authenticates people and services, what each role may do, how tenants are kept apart and how to run it locally. The decision record is [ADR-0015](../adr/0015-identity-authorisation-and-tenant-isolation.md).

## Model

- **Identity provider:** any OpenID Connect provider. Keycloak runs locally; Microsoft Entra ID is a configuration change ([below](#switching-to-microsoft-entra-id)).
- **API:** an OAuth 2.0 resource server. It verifies JWT access tokens (signature against the issuer's JWKS, `iss`, `aud`, `exp`/`nbf` with clock skew, asymmetric algorithms only) and maps claims to a principal `{ userId, orgId, roles, scopes, permissions }`.
- **Organisation:** taken only from the token's organisation claim. A token without exactly one valid organisation, or without a known role, is rejected with 401.
- **Code:** `libs/access` (framework-free roles, permissions, matrix, claim mapping; shared with the web app) and `libs/auth` (token verifier, stream tickets, Nest guards and decorators).

## Roles and permissions

Roles are the spec §40 names. A route needs exactly one permission. `anonymous` is built in for the public demo and cannot be assigned in the identity provider.

| Permission           | platform-operator | tenant-owner | producer | analyst | developer | viewer | anonymous |
| -------------------- | :---------------: | :----------: | :------: | :-----: | :-------: | :----: | :-------: |
| fixtures:read        |                   |      ✓       |    ✓     |    ✓    |     ✓     |   ✓    |     ✓     |
| fixtures:write       |                   |              |          |         |     ✓     |        |           |
| events:ingest        |                   |              |          |         |     ✓     |        |           |
| insights:read        |                   |      ✓       |    ✓     |    ✓    |     ✓     |   ✓    |     ✓     |
| insights:write       |                   |              |          |    ✓    |           |        |           |
| overlays:read        |                   |      ✓       |    ✓     |    ✓    |     ✓     |   ✓    |     ✓     |
| agents:traces:read   |                   |      ✓       |    ✓     |    ✓    |     ✓     |        |     ✓     |
| replay:control       |                   |      ✓       |    ✓     |    ✓    |     ✓     |   ✓    |     ✓     |
| editorial:approve    |                   |              |    ✓     |         |           |        |           |
| editorial:publish    |                   |              |    ✓     |         |           |        |           |
| audit:read           |                   |      ✓       |    ✓     |         |           |        |           |
| preferences:write    |                   |      ✓       |    ✓     |    ✓    |           |   ✓    |           |
| members:manage       |                   |      ✓       |          |         |           |        |           |
| policy:configure     |                   |      ✓       |          |         |           |        |           |
| billing:read         |                   |      ✓       |          |         |           |        |           |
| platform:diagnostics |         ✓         |              |          |         |           |        |           |
| platform:config      |         ✓         |              |          |         |           |        |           |

The source of truth is `libs/access/src/lib/matrix.ts`; `libs/access/tests/matrix.spec.ts` pins the spec rules (only producers publish, a producer cannot read billing, the platform operator sees no tenant data, the anonymous demo is read-only apart from replay controls).

If a token's `scope` claim names any of these permissions, the effective set is the intersection with the role permissions, so a client can narrow a user's access but never widen it.

## API enforcement

- Guards run in this order on every request: `AuthenticationGuard` (resolves the principal), `PrincipalThrottlerGuard` (signed-in callers get a per-user budget; the anonymous demo keeps the per-IP one), `PermissionGuard` (deny by default).
- Every route declares one permission with `@RequirePermission` (or `@RequireAuthenticated` for `/me`); health is `@PublicRoute`. `apps/api/src/app/auth/route-permissions.spec.ts` fails if a route declares nothing.
- Services receive the organisation from `@CurrentPrincipal()` / `@FixtureScope()` / `@Caller()`, never from `DEMO_ORG_ID`, the path, the query or the body. Another organisation's id answers the same 404 as a missing one.
- Editorial routes (ADR-0016) use the same declaration; the principal is adapted to their `Actor`.

| Route                                                                       | Permission           |
| --------------------------------------------------------------------------- | -------------------- |
| `GET /fixtures`, `/fixtures/:id`, `/events`, `/state`, `/stream`, `/replay` | `fixtures:read`      |
| `GET /fixture-templates`, `/replay-sessions`, `POST /stream-tickets`        | `fixtures:read`      |
| `POST /fixtures`                                                            | `fixtures:write`     |
| `POST /fixtures/:id/events:batch`                                           | `events:ingest`      |
| `GET /insights`, `/narratives`, `/recap`                                    | `insights:read`      |
| `GET /overlays`, `/editorial`, `/editorial/kill-switch`                     | `overlays:read`      |
| `GET /agent-runs`                                                           | `agents:traces:read` |
| `POST /fixtures/:id/sessions`, `POST /fixtures/:id/replay`                  | `replay:control`     |
| `POST /insights/:id/suppress`                                               | `editorial:approve`  |
| `POST /overlays/:id/retract`, freeze, resume, kill switch                   | `editorial:publish`  |
| `GET /audit-events`                                                         | `audit:read`         |
| `GET /me`, `POST /me/sign-in`, `POST /me/sign-out`                          | any principal        |

### Streams

`POST /api/v1/fixtures/:id/stream-tickets` returns `{ ticket, expiresAt }`: an HS256 JWT (`STREAM_TICKET_SECRET`) bound to the user, organisation and fixture, valid for `STREAM_TICKET_TTL_SECONDS` (60). `GET /fixtures/:id/stream?ticket=` accepts it for that fixture only, and the principal it yields can only read. Bearer headers work on the stream too. Problem responses never echo the query string.

### Row-level security

Migration `0004_tenant_row_level_security` creates the `matchiq_app` role (`NOLOGIN`, no `BYPASSRLS`), grants it DML on every table with `org_id`, enables RLS with the policy `org_id = current_setting('app.org_id', true)`, and revokes `UPDATE`/`DELETE` on `audit_events`. Every tenant transaction starts with `set_config('app.org_id', …, true), set_config('role', 'matchiq_app', true)`; the ledger, pipeline and editorial transactions pin to the first organisation they touch and refuse a second. With the role set but no organisation, queries see nothing. System work runs as the owner: migrations, seeding, the outbox relay, retention, the worker's boot scans (`systemListInState`, `systemPendingInsights`).

In production the API and worker connect as a role that may `SET ROLE matchiq_app` (the migration grants it to a non-superuser migrating role).

### Audit

Rows carry the real actor id (the token `sub`), `actor_type` (`USER`, `SERVICE`, `OPERATOR`, `ANONYMOUS`, `SYSTEM`; migration `0005_audit_actor_types`) and the actor's roles: fixture creation, ingest, replay sessions and commands, editorial actions, sign-in and sign-out, and every 403 for a signed-in caller (`auth.access-denied`).

## Web sign-in

The web app is the OIDC relying party, using `openid-client` 6.8.8, an OpenID-certified library by the author of `jose`.

**Sign-in and sign-out routes**

- `GET /auth/sign-in` starts Authorization Code + PKCE (S256). It accepts an optional `login_hint` and a same-origin `returnTo`. The verifier, `state` and `nonce` sit in a sealed cookie that lives for 10 minutes.
- `GET /auth/callback` checks `state`, PKCE, `nonce`, the issuer and the ID token. It then stores the session and records `auth.signed-in` through the API.
- `POST /auth/sign-out` is same-origin only. It clears the session, records `auth.signed-out` and redirects to the provider's end-session endpoint with `id_token_hint`.

**Session storage**

- The session lives in an encrypted (JWE `dir` + A256GCM), httpOnly, `SameSite=Lax` cookie. It is `Secure` with a `__Host-` prefix on https.
- It is split into chunks when it outgrows the 4 KiB cookie limit.
- Access tokens are refreshed 30 s before they expire. Browser JavaScript never sees a token.

**API calls**

- Signed-in calls go through the same-origin backend-for-frontend `/bff/*`.
- The BFF adds the bearer token, refuses cross-origin writes and refuses `.` / `..` path segments.
- Signed-out calls go straight to the API as the public demo.

**Streams.** Each (re)connection asks the BFF for a stream ticket, then opens the API stream directly with `?ticket=`.

**Role-aware UI**

- `GET /auth/session` returns the user's name, organisation, roles and effective permissions. It never returns tokens.
- `useCan(permission)` and `<RequirePermission>` hide controls the role lacks and name the roles that would grant them.
- An API 403, or a screen the role cannot use (e.g. the agent observatory for a viewer), renders an accessible 403 region.
- The user menu shows the name, organisation and role.

**Demo accounts.** The sign-in page lists them only when `NEXT_PUBLIC_DEMO_MODE=true` and sign-in is configured. Each account opens the normal provider login with `login_hint`; the password is shown, never submitted. Judges can still use the public demo without signing in.

To run sign-in locally, set `OIDC_ISSUER_URL`, `OIDC_WEB_CLIENT_ID=matchiq-web` and `WEB_SESSION_SECRET` (`openssl rand -hex 32`) in `.env`. Then run the web app natively (`pnpm nx dev web`). The compose `web` container runs the public demo only, because `localhost:8180` is not Keycloak from inside a container.

## Local setup

```bash
cp .env.example .env
pnpm infra:up        # Postgres :54320, Redis :63790, Keycloak :8180
```

Keycloak imports `infra/keycloak/matchiq-realm.json` on start. The admin console is <http://localhost:8180/admin> (`admin` / `admin`).

| Realm object  | Purpose                                                                                                                                                                                                |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `matchiq`     | The realm. Access tokens live 5 minutes; refresh tokens rotate.                                                                                                                                        |
| `matchiq-web` | Public client, Authorization Code + PKCE (S256 required), no password grant. Redirects to `http://localhost:4200/auth/callback` (and `:4318` for e2e). Maps `org`, `org_name` and `roles` into tokens. |
| `matchiq-api` | Bearer-only resource server. Its client roles are the six product roles; the web client's audience mapper puts `matchiq-api` in `aud`.                                                                 |
| User profile  | `org` and `org_name` are admin-only attributes: users cannot change their own organisation in the account console.                                                                                     |

### Demo accounts (development only)

Every account uses the password **`matchiq-dev-only`**. These credentials exist only in the local realm export and must never be used anywhere else.

| Username             | Organisation                                  | Role              |
| -------------------- | --------------------------------------------- | ----------------- |
| `harbour.owner`      | `org_demo` (Harbour Media, synthetic)         | tenant-owner      |
| `harbour.producer`   | `org_demo`                                    | producer          |
| `harbour.analyst`    | `org_demo`                                    | analyst           |
| `harbour.developer`  | `org_demo`                                    | developer         |
| `harbour.viewer`     | `org_demo`                                    | viewer            |
| `northbank.producer` | `org_northbank` (Northbank Sports, synthetic) | producer          |
| `northbank.viewer`   | `org_northbank`                               | viewer            |
| `platform.operator`  | `org_platform`                                | platform-operator |

`org_demo` is also the anonymous demo tenant. `org_northbank` exists to demonstrate that one organisation cannot see another's sessions, insights, overlays or audit records.

## Switching to Microsoft Entra ID

No code changes. In Entra ID:

1. Register an application for the API. Under **Expose an API** set the Application ID URI (for example `api://matchiq-api`). Under **App roles** add the six roles with the values `platform-operator`, `tenant-owner`, `producer`, `analyst`, `developer`, `viewer`. Set `accessTokenAcceptedVersion` to `2` in the manifest.
2. Register an application for the web app (platform **Web**, redirect URI `https://<web>/auth/callback`, front-channel logout `https://<web>/`). Grant it the API's delegated scope.
3. Assign users or groups to app roles on the API's enterprise application.
4. Emit the organisation: either a directory extension attribute through optional claims, or a claims-mapping policy that writes a claim named `org`. Values must look like `org_<id>`.

Then set:

| Variable              | Keycloak (local)                       | Entra ID                                                 |
| --------------------- | -------------------------------------- | -------------------------------------------------------- |
| `OIDC_ISSUER_URL`     | `http://localhost:8180/realms/matchiq` | `https://login.microsoftonline.com/<tenant-id>/v2.0`     |
| `OIDC_AUDIENCE`       | `matchiq-api`                          | the API's application (client) ID or Application ID URI  |
| `OIDC_JWKS_URL`       | unset (discovery)                      | unset (discovery)                                        |
| `OIDC_ORG_CLAIM`      | `org`                                  | `org`, or the extension claim name such as `extn.org`    |
| `OIDC_ROLES_CLAIM`    | `roles`                                | `roles`                                                  |
| `OIDC_NAME_CLAIM`     | `name`                                 | `name`                                                   |
| `OIDC_ORG_NAME_CLAIM` | `org_name`                             | an optional claim, or leave the default (it is optional) |

Literal claim names win over dotted paths, so Entra's `extn.org` works as a name while Keycloak paths such as `realm_access.roles` still resolve.

## Threat notes

| Threat                               | Control                                                                                                                                          |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Forged or tampered token             | Signature verified against the issuer's JWKS; `alg: none` and HMAC algorithms refused; unknown `kid` triggers at most one JWKS refetch per 30 s. |
| Token for another API or an ID token | `aud` must contain `OIDC_AUDIENCE`; Keycloak `typ` other than `Bearer` refused.                                                                  |
| Replayed or stolen token             | 5-minute access tokens, 30 s skew tolerance. Revocation is bounded by the token lifetime; there is no introspection.                             |
| Role escalation through scopes       | Scopes only narrow role permissions.                                                                                                             |
| Organisation spoofing                | The organisation comes only from a verified claim; path, query and body values are never trusted. Users cannot edit the `org` attribute.         |
| Credential confusion                 | A request that presents an invalid credential is refused, never downgraded to anonymous.                                                         |
| Identity provider outage             | JWKS is cached for 10 minutes; discovery and JWKS failures answer 503 `auth-unavailable`, not 401.                                               |
| Operator key leakage                 | The key is off by default, refused when `APP_ENV=prod`, compared in constant time, and grants only developer and producer rights in one org.     |

## Tests

- `libs/access`: the matrix rules and claim mapping (Keycloak and Entra shapes, missing or multiple organisations, unknown roles, scope narrowing).
- `libs/auth`: token verification against a local test issuer (valid, expired, within skew, not yet valid, wrong audience, wrong issuer, tampered payload, foreign key, unknown `kid`, `alg: none`, HMAC, ID-token type, missing claims, unreachable or spoofed discovery, JWKS caching), stream tickets (binding, expiry, narrowing, tampering) and the Nest guards (401 and 403 problem details and challenges, deny-by-default, anonymous fallback, operator key).
- `libs/config`: `AuthEnv` cross-field rules (issuer and audience together, operator key refused in prod, https issuer in prod, at least one way in).
- `libs/db` (real Postgres): every `org_id` table has RLS and a policy and the app role has nothing else; a tenant sees only its rows without a `WHERE`; no organisation means no rows; cross-tenant writes are refused; `audit_events` is append-only for the app role; a two-tenant unit of work is refused and rolled back; readers answer guessed ids with nothing.
- `apps/api` access control (real API, test issuer): anonymous reads and 403 on writes; 401 for expired, wrong-audience, wrong-issuer, foreign-key and tampered tokens; viewer writes refused and audited; scopes narrow but never widen; platform operator gets no tenant data; tokens without an organisation or role are refused; developer writes audited as themselves; operator key; `/me`, sign-in and sign-out audit; per-user rate-limit budget; 401 with a bare challenge when the anonymous demo is off.
- `apps/api` cross-tenant isolation: org A cannot list, read (fixture, events, state, insights, narratives, overlays, recap, agent runs, replay status), command, stream, ticket, suppress, retract, freeze, resume or read editorial status for org B; the kill switch and `audit-events` stay per organisation; organisation hints in headers, query and body are ignored; identical ids are namespaced; audit rows carry the real user.
- `apps/api` route declarations: every route declares a permission.

Exercised against the real local Keycloak realm: a PKCE login as `harbour.producer` produced a token the API accepted (`GET /me` returned `org_demo`, role `producer`); a `northbank.viewer` token was refused `POST /fixtures` with 403; the producer started a replay session.

- `apps/web`: session sealing and tampering, safe `returnTo`, ticketed stream transport (fresh ticket per connection), role-aware components (hidden controls, 403 region, user menu), `WebServerEnv` rules.
- `apps/web-e2e` (`auth.spec.ts`): sign-in as producer, viewer, analyst, tenant owner and a second-organisation producer; wrong password; sign-out; viewer 403 on the observatory; producer replay controls; platform operator 403; axe in light and dark. The suite runs against the bundled test issuer in CI and against the real Keycloak realm with `E2E_OIDC_ISSUER=http://localhost:8180/realms/matchiq E2E_PORT=4328` (22/22 passed locally, desktop light and dark).

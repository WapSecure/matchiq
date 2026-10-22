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

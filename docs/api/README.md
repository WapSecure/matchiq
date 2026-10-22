# MatchIQ API

The contract is [`openapi.json`](./openapi.json) (OpenAPI 3.1). It is generated from the Zod schemas in `libs/contracts` and the route registry in `apps/api/src/app/openapi/routes/` (ADR-0017), so never edit it by hand. All data is synthetic.

## Viewing it

| Where                   | URL                                                                                |
| ----------------------- | ---------------------------------------------------------------------------------- |
| Running API (local)     | `http://localhost:<API_PORT>/api/v1/docs` (Swagger UI), `/api/v1/openapi.json`     |
| Without running the API | Open `docs/api/openapi.json` in any OpenAPI 3.1 viewer, or lint it (command below) |

The docs routes are on everywhere except `APP_ENV=prod`. `API_DOCS_ENABLED=true` publishes them in prod, and `false` hides them anywhere. Swagger UI is served from the pinned `swagger-ui-dist` package (no CDN) under a page CSP of `script-src 'self'`.

## Changing the API

1. Add or change the Zod schema in `libs/contracts`. Wire types belong there, never in `libs/db` or `apps/*`.
2. Add or change the controller route, then its entry in `apps/api/src/app/openapi/routes/*.routes.ts` (auth, params, query, body, success schema, problem kinds).
3. Regenerate and commit:

   ```bash
   pnpm nx run api-client:codegen   # runs api:openapi first: docs/api/openapi.json, then libs/api-client/src/generated
   pnpm exec spectral lint docs/api/openapi.json --ruleset .spectral.yaml --fail-severity warn
   ```

CI fails if a Nest route is missing from the registry or a registry entry has no route (`openapi.integration.spec.ts`). It also fails if the committed document or client is stale, or if Spectral reports a warning.

## Conventions

- Base path `/api/v1`. Resources are named `fixtures` (ADR-0005). JSON bodies are strict, so unknown fields are rejected with 422.
- Wall-clock times are UTC ISO-8601 with `Z`. The match clock is `matchClockMs` within `period`. IDs are prefixed (`fx_`, `in_`, `ov_`, …).
- Every response carries `X-Request-ID`. Send your own (8–128 characters of `A-Za-z0-9._:-`) to correlate logs; a malformed one is replaced.
- Statistics come only from the deterministic engine. Narratives cite `eventIds` and `metricRef`s and never introduce numbers.

## Versioning and deprecation

- The major version is in the path (`/api/v1`). `info.version` follows the API package version (semver).
- Additive changes ship within v1: new endpoints, new optional request fields, new response fields, new enum values on fields documented as open, new problem types. Clients must ignore unknown response fields.
- Breaking changes need a new major path (`/api/v2`) and an ADR. Removing or renaming a field, tightening validation, or changing a status code is breaking.
- Deprecation policy: a deprecated operation is marked `deprecated: true` in the document and must answer with `Deprecation` and `Sunset` headers (RFC 9745, RFC 8594). It stays served for at least 90 days, or one judged release, whichever is longer. Stream message types follow the same rule.

## Pagination

- **Keyset by sequence.** `GET /fixtures/{id}/events?afterSequence=&limit=` returns `{ items, nextAfterSequence }`. Pass `nextAfterSequence` back until it is `null`. `limit` is 1–500 (default 100).
- **Opaque cursor.** `GET /audit-events?cursor=&limit=` returns `{ items, nextCursor }`, newest first. Treat the cursor as opaque. A tampered one is `400 invalid-cursor`.
- **Bounded lists.** `GET /fixtures` (`limit` up to 100), `/replay-sessions` (up to 100), `/fixture-templates` and the per-fixture reads return `{ items }` without a cursor.

## Idempotency

- Every write accepts `Idempotency-Key` (1–255 visible ASCII). A retry with the same key and body returns the stored response with `Idempotent-Replayed: true`. The same key with a different body is `422 idempotency-key-reused`.
- Only successful responses are stored, so a failed request can be retried with the same key. Keys are pruned after `IDEMPOTENCY_RETENTION_HOURS`.
- Editorial commands are also no-ops when repeated: the response says `changed: false` and writes no audit row.

## Errors

Errors are RFC 9457 `application/problem+json` with `type = urn:matchiq:problem:<slug>`, `title`, `status`, and optionally `detail`, `instance`, `requestId` and `errors[]` (field-level, for 422). Each operation lists its possible types under its error responses (`x-problem-types`, with one example per type). Branch on `type`, not `title`.

| Status | Typical types                                                                                                                                                 |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 400    | `bad-request` (malformed JSON), `invalid-header`, `invalid-cursor`                                                                                            |
| 401    | `unauthorized` (with `WWW-Authenticate: Bearer`)                                                                                                              |
| 403    | `forbidden` (valid caller without the permission)                                                                                                             |
| 404    | `fixture-not-found`, `fixture-template-not-found`, `replay-session-not-found`, `state-not-found`, `recap-not-ready`, `overlay-not-found`, `insight-not-found` |
| 409    | `fixture-exists`, `event-conflict`, `replay-state-conflict`, `overlay-not-on-air`, `insight-already-published`                                                |
| 422    | `validation-failed`, `fixture-mismatch`, `idempotency-key-reused`                                                                                             |
| 429    | `rate-limited`. Honour `Retry-After` (the replay bucket sends `Retry-After-replay`)                                                                           |
| 503    | `replay-capacity` (with `Retry-After`), `replay-unavailable`, `stream-unavailable`, `auth-unavailable`                                                        |

## Authentication

Every operation names its permission in `x-matchiq-permission` (ADR-0015), and its `security` lists the ways in:

- **OIDC (`oidc`):** `Authorization: Bearer <access token>` from `OIDC_ISSUER_URL`. Roles map to permissions. A token `scope` that names MatchIQ permissions narrows them.
- **Operator key (`operatorKey`):** `Authorization: Bearer <OPERATOR_API_KEY>`, a dev and CI fallback behind `AUTH_OPERATOR_KEY_ENABLED` that is refused in prod. It acts as developer + producer.
- **Stream ticket (`streamTicket`):** `?ticket=` from `POST /fixtures/{id}/stream-tickets`, valid on that fixture's stream only.
- **Anonymous (`{}`):** listed only where the anonymous demo principal holds the permission (demo reads, traces and replay controls) and `AUTH_ANONYMOUS_DEMO_ENABLED=true`.

Health and the docs routes are public. A missing or bad credential is `401 unauthorized`, and a valid caller without the permission is `403 forbidden`. When the identity provider cannot be reached, the API answers `503 auth-unavailable`. `openapi.integration.spec.ts` checks that the documented permission equals the one each handler declares to the guards.

## Streaming

`GET /fixtures/{id}/stream` is Server-Sent Events (`text/event-stream`). Each event has `id: <streamSequence>`, `event: <type>` and `data: <StreamMessage JSON>`. The `StreamMessage` component defines every message type, discriminated by `type`. Its `x-sse-data` reference marks it on the operation.

- **Resume:** send `Last-Event-ID`, or `?lastEventId=` for clients that cannot set headers. The header wins.
- **Gaps:** if `streamSequence` jumps, refetch `GET /fixtures/{id}/state` and reconnect. Delivery is at least once, so dedupe on `streamSequence`.
- **Heartbeat:** `heartbeat` messages keep idle connections open, and `retry` is 2 s.

## Typed client

`@matchiq/api-client` exports `createApiClient({ baseUrl })`, an `openapi-fetch` client typed by this document, plus `ApiSchemas` for component types. Responses are typed, not validated. Validate with the `@matchiq/contracts` schema where the data crosses a trust boundary, as `apps/web/src/lib/api/typed-client.ts` does.

Follow-up: move the remaining `apps/web/src/lib/api/endpoints.ts` calls from `requestJson` to the client, then delete the local copies in `session-schemas.ts` and `trace-schemas.ts` in favour of the contracts schemas.

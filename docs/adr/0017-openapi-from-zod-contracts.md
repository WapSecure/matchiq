# ADR-0017: OpenAPI 3.1 generated from the Zod contracts

- Status: Accepted (2026-10-22). Implements audit item P0-8 and the API half of spec §11 and §45 ("OpenAPI generated and validated in CI; typed SDK"). Builds on ADR-0005 (API and streaming conventions) and ADR-0015 (identity).

## Context

The API had no machine-readable description. Integrators had to read controllers, the web kept hand-written Zod copies of response shapes, and several wire types (`FixtureTemplateSummary`, `ReplaySessionView`, `CreatedSession`, `RecapDocument`, `InsightTrace`, `ItemList`, the event page) lived as TypeScript interfaces in `libs/db`, outside the contract library. Controllers are also being edited by the identity stream, so decorating every handler was not an option.

## Decision

- **Contracts first.** Every wire type is a Zod schema in `libs/contracts` (`lobby.ts`, `reads.ts`). `libs/db` re-exports those types for its ports, and the API services return them. The Python agents do not consume API responses, so `CROSS_LANGUAGE_CONTRACTS` and the generated Pydantic models are unchanged.
- **A route registry, not decorators.** `apps/api/src/app/openapi/routes/*.routes.ts` declares each operation: method, path, tag, auth, path/query/body schemas, success status and schema, idempotency and the problem kinds it can raise. `build-document.ts` turns the registry into OpenAPI 3.1 with `zod-openapi`. Controllers are untouched.
- **Drift is a test failure.**
  - `openapi.integration.spec.ts` boots the real app and compares the Express router's routes with the registry in both directions.
  - The same spec validates real responses (lobby, sessions, fixture, events, replay status, reads, editorial status, health) against the registry's schemas.
  - `openapi-document.spec.ts` fails when `docs/api/openapi.json` differs from the generated document. `pnpm nx run api:openapi` regenerates it, and the CI drift step reruns it with `git diff --exit-code`.
  - Spectral (`.spectral.yaml`: `spectral:oas` recommended plus MatchIQ rules for problem media types, `urn:matchiq:problem:` types, declared security and summaries) runs in CI, and its output goes to the job summary.
- **What the document carries.**
  - RFC 9457 responses per route, grouped by status, with an example and `x-problem-types` for each `type` URI.
  - The `Idempotency-Key`, `X-Request-ID` and `Last-Event-ID` request headers, and the `Idempotent-Replayed`, `Retry-After` and `X-Request-ID` response headers.
  - The SSE endpoint as `text/event-stream`, with `x-sse-data` pointing at the `StreamMessage` component (OpenAPI 3.1 has no item schema for event streams).
  - Security per operation from ADR-0015: `oidc` (`openIdConnect`, discovery from `OIDC_ISSUER_URL`), the dev/CI `operatorKey`, `streamTicket` on the stream, and `{}` where the anonymous demo principal holds the permission. `x-matchiq-permission` names the permission, and the integration spec checks it against the `@RequirePermission`/`@PublicRoute` metadata the guards read.
  - `info.version` from `apps/api/package.json`, which a test enforces. `servers` come from `API_PUBLIC_URL` when served, and from the config default in the committed file.
- **Serving.** `GET /api/v1/openapi.json` and a self-hosted Swagger UI at `/api/v1/docs`. The assets come from the exact-pinned `swagger-ui-dist`, with no CDN, under a page CSP with `script-src 'self'` and no validator call-out. Both are on unless `APP_ENV=prod`; `API_DOCS_ENABLED` overrides that either way.
- **Typed client.** `libs/api-client` holds `openapi-typescript` output generated from the committed document (`nx run api-client:codegen`, which is checked for drift) and an `openapi-fetch` wrapper. The web's `fetchTemplates` uses it and still validates the body with Zod. The remaining endpoints migrate later.

## Library choices

| Need           | Chosen                           | Why                                                                                                                                                                                                                                 | Rejected                                                                                                                       |
| -------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Zod → OpenAPI  | `zod-openapi` 6.0.2              | Peer `zod ^4`, the repo pins 4.6.7. Built on Zod's native `z.toJSONSchema`, the same converter `contracts:export-json-schema` uses for Pydantic, so the OpenAPI schemas and the Python models cannot disagree. One small dependency | `@asteasolutions/zod-to-openapi` 9.1.0: its own schema walker (a second conversion path); hand-rolling: no 3.1 component reuse |
| Docs UI        | `swagger-ui-dist` 5.33.1         | Static files we serve ourselves; works under `script-src 'self'`; OpenAPI 3.1 support                                                                                                                                               | Scalar and Redoc: larger dependency trees, CDN fonts by default                                                                |
| Lint           | `@stoplight/spectral-cli` 6.17.0 | Standard OAS ruleset plus declarative custom rules                                                                                                                                                                                  | Redocly CLI: comparable, but Spectral rules are simpler to read in review                                                      |
| Client types   | `openapi-typescript` 7.13.0      | Types only, no runtime                                                                                                                                                                                                              | Generated class SDKs (bigger, and they duplicate Zod validation)                                                               |
| Client runtime | `openapi-fetch` 0.17.0           | About 6 kB, typed by those paths                                                                                                                                                                                                    | —                                                                                                                              |

`openapi-typescript` declares a peer of `typescript ^5`, and the repo uses 6.0.3. It only uses the stable compiler factory API, the generated output typechecks, and its only role is a dev-time generator. Revisit this when it publishes a TypeScript 6 peer range. `swagger-ui-dist` depends on `@scarf/scarf`, whose install script pnpm 10 does not run, because no `onlyBuiltDependencies` entry allows it.

## Consequences

- A new controller route fails CI until it has a registry entry, and a removed route fails until its entry goes.
- The registry states auth and problems by hand, so it can be wrong where tests do not reach. Auth is cross-checked against guard metadata, but problem kinds are not, and the response-conformance test covers success bodies only.
- The committed document is about 340 kB. Shared contracts are named components, and other reused sub-schemas are inlined, which keeps type names stable for clients.

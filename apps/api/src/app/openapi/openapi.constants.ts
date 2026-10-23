/** Kept equal to `apps/api/package.json` `version` by `openapi-document.spec.ts`. */
export const API_CONTRACT_VERSION = '0.0.1';

export const OPENAPI_VERSION = '3.1.0';

export const DOCS_ROUTES = {
  document: 'openapi.json',
  ui: 'docs',
  asset: 'docs/:asset',
} as const;

export const MEDIA = {
  json: 'application/json',
  problem: 'application/problem+json',
  eventStream: 'text/event-stream',
  html: 'text/html',
  javascript: 'text/javascript',
  css: 'text/css',
} as const;

export const SECURITY = {
  oidc: 'oidc',
  operatorKey: 'operatorKey',
  streamTicket: 'streamTicket',
} as const;

export const TAGS = {
  fixtures: 'Fixtures',
  replay: 'Replay',
  intelligence: 'Intelligence',
  stream: 'Stream',
  editorial: 'Editorial',
  audit: 'Audit',
  identity: 'Identity',
  platform: 'Platform',
} as const;

export type Tag = (typeof TAGS)[keyof typeof TAGS];

export const EXTENSIONS = {
  permission: 'x-matchiq-permission',
  problemTypes: 'x-problem-types',
  streamMessage: 'x-sse-data',
  conditional: 'x-matchiq-conditional',
} as const;

export const DOCUMENT_TEXT = {
  title: 'MatchIQ API',
  summary:
    'Synthetic football intelligence: fixtures, replay, insights and overlays.',
  description: [
    'Generated from the Zod contracts in `libs/contracts` (ADR-0017). All data is synthetic.',
    'Errors are RFC 9457 problem details with `type = urn:matchiq:problem:<slug>`.',
    'Conventions, versioning, pagination, idempotency, auth and streaming: `docs/api/README.md`.',
  ].join('\n\n'),
  license: 'MIT',
  localServer: 'Local development',
  configuredServer: 'This deployment (API_PUBLIC_URL)',
  oidc:
    'OIDC access token from `OIDC_ISSUER_URL`, sent as `Authorization: Bearer <JWT>` (ADR-0018). ' +
    'Roles map to permissions; a token `scope` naming MatchIQ permissions narrows them.',
  oidcDiscovery: 'https://issuer.example/.well-known/openid-configuration',
  operatorKey:
    'Dev and CI fallback (`AUTH_OPERATOR_KEY_ENABLED`, refused in prod): `Authorization: Bearer <OPERATOR_API_KEY>`. ' +
    'Acts as developer + producer.',
  streamTicket:
    'Short-lived ticket from `POST /fixtures/{fixtureId}/stream-tickets`, accepted only on that fixture stream.',
  streamTicketParam: 'ticket',
  docsConditional: 'Served unless APP_ENV=prod, or when API_DOCS_ENABLED=true.',
} as const;

export const HEADER_TEXT = {
  idempotencyKey:
    'Client-chosen key (1-255 visible ASCII). A retry with the same key and body replays the stored response; a different body is a 422.',
  idempotentReplayed:
    'Present and `true` when the response is a stored replay.',
  retryAfter: 'Seconds to wait before retrying.',
  lastEventId:
    'Resume after this `streamSequence`. Wins over `?lastEventId=` (for clients that cannot set headers).',
  requestId:
    'Optional caller request ID (8-128 of `A-Za-z0-9._:-`); a malformed one is replaced. Echoed on every response.',
} as const;

export const ACCESS = {
  public: 'Access: public, no credentials (`@PublicRoute`).',
  authenticated:
    'Access: any authenticated caller, including the anonymous demo principal.',
  permission: (permission: string, anonymous: boolean) =>
    `Access: requires the \`${permission}\` permission.` +
    (anonymous
      ? ' The anonymous demo principal holds it when `AUTH_ANONYMOUS_DEMO_ENABLED=true`.'
      : ''),
} as const;

export const KEYSET_TEXT =
  'Keyset pagination: pass `nextCursor` back as `cursor` until it is null. A tampered cursor, or one from another list, is `400 invalid-cursor`.';

export const STREAM_TEXT = {
  description:
    'Server-Sent Events. Each event has `id: <streamSequence>`, `event: <type>` and `data: <StreamMessage JSON>`. ' +
    'Heartbeats keep the connection open. On a gap, refetch `/state` and reconnect with `Last-Event-ID`.',
} as const;

export const DOCS_ASSETS = {
  'swagger-ui.css': { file: 'swagger-ui.css', type: MEDIA.css },
  'swagger-ui-bundle.js': {
    file: 'swagger-ui-bundle.js',
    type: MEDIA.javascript,
  },
  'docs-init.js': { file: null, type: MEDIA.javascript },
} as const;

export type DocsAssetName = keyof typeof DOCS_ASSETS;

export const CSP_HEADER = 'Content-Security-Policy';

/** Docs page only: the bundle and initialiser are same-origin files, so no inline script is allowed. */
export const DOCS_CSP = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join('; ');

export const DOCS_CACHE = 'public, max-age=300';

export const OPENAPI_PATTERNS = {
  trailingSlash: /\/$/,
  /** A path-to-regexp parameter; `\:` is a literal colon (`events\:batch`). */
  nestParam: /(?<!\\):([A-Za-z]\w*)/g,
  escapedColon: /\\:/g,
} as const;

/** Workspace-relative path of the committed document (the CI drift check diffs it). */
export const COMMITTED_DOCUMENT_PATH = 'docs/api/openapi.json';
export const DOCUMENT_WRITE_FLAG = 'OPENAPI_WRITE';

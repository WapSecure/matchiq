import { HealthStatus } from '@matchiq/contracts';
import { z } from 'zod';
import { DOCUMENT_TEXT, MEDIA, TAGS } from '../openapi.constants';
import { type ApiRoute, json } from '../route-types';

const OpenApiDocument = z.looseObject({ openapi: z.string() });

export const DocsAssetPath = z.strictObject({
  asset: z.enum(['swagger-ui.css', 'swagger-ui-bundle.js', 'docs-init.js']),
});

export const PLATFORM_ROUTES: readonly ApiRoute[] = [
  {
    operationId: 'getLiveness',
    method: 'get',
    path: '/health/live',
    tag: TAGS.platform,
    summary: 'Liveness: the process is serving requests',
    auth: { kind: 'public' },
    success: { status: 200, description: 'Alive', body: json(HealthStatus) },
    problems: [],
  },
  {
    operationId: 'getReadiness',
    method: 'get',
    path: '/health/ready',
    tag: TAGS.platform,
    summary: 'Readiness: Postgres and Redis are reachable',
    auth: { kind: 'public' },
    success: {
      status: 200,
      description: 'Ready or degraded',
      body: json(HealthStatus),
    },
    alsoSucceedsWith: [
      {
        status: 503,
        description: 'Unavailable; the same body names the failing checks',
      },
    ],
    problems: [],
  },
  {
    operationId: 'getOpenApiDocument',
    method: 'get',
    path: '/openapi.json',
    tag: TAGS.platform,
    summary: 'This OpenAPI 3.1 document',
    auth: { kind: 'public' },
    success: {
      status: 200,
      description: 'OpenAPI document',
      body: json(OpenApiDocument),
    },
    problems: [],
    conditional: DOCUMENT_TEXT.docsConditional,
  },
  {
    operationId: 'getApiDocs',
    method: 'get',
    path: '/docs',
    tag: TAGS.platform,
    summary: 'Interactive API reference (self-hosted Swagger UI)',
    auth: { kind: 'public' },
    success: {
      status: 200,
      description: 'HTML page',
      body: { kind: 'raw', mediaType: MEDIA.html },
    },
    problems: [],
    conditional: DOCUMENT_TEXT.docsConditional,
  },
  {
    operationId: 'getApiDocsAsset',
    method: 'get',
    path: '/docs/{asset}',
    tag: TAGS.platform,
    summary: 'Static asset of the API reference page',
    auth: { kind: 'public' },
    params: DocsAssetPath,
    success: {
      status: 200,
      description: 'Script or stylesheet',
      body: { kind: 'raw', mediaType: MEDIA.javascript },
    },
    problems: ['validation'],
    conditional: DOCUMENT_TEXT.docsConditional,
  },
];

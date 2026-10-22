import { createDocument, type ZodOpenApiPathsObject } from 'zod-openapi';
import { NAMED_SCHEMAS } from './components';
import {
  API_CONTRACT_VERSION,
  DOCUMENT_TEXT,
  OPENAPI_PATTERNS,
  OPENAPI_VERSION,
  SECURITY,
  TAGS,
} from './openapi.constants';
import { operationOf } from './operation';
import type { ApiRoute } from './route-types';
import { API_ROUTES } from './routes';

export interface OpenApiServer {
  readonly url: string;
  readonly description: string;
}

export interface OpenApiOptions {
  readonly servers: readonly OpenApiServer[];
  /** OIDC issuer for the planned bearer scheme; a placeholder when unset. */
  readonly oidcIssuerUrl?: string;
  readonly routes?: readonly ApiRoute[];
}

const DISCOVERY_SUFFIX = '/.well-known/openid-configuration';

const pathsOf = (routes: readonly ApiRoute[]): ZodOpenApiPathsObject => {
  const paths: ZodOpenApiPathsObject = {};
  for (const route of routes) {
    paths[route.path] = {
      ...paths[route.path],
      [route.method]: operationOf(route),
    };
  }
  return paths;
};

const oidcDiscovery = (issuer: string | undefined): string =>
  issuer
    ? `${issuer.replace(OPENAPI_PATTERNS.trailingSlash, '')}${DISCOVERY_SUFFIX}`
    : DOCUMENT_TEXT.oidcDiscovery;

/** Builds the OpenAPI 3.1 document from the route registry and the Zod contracts. */
export const buildOpenApiDocument = (
  options: OpenApiOptions,
): OpenApiDocument =>
  createDocument(
    {
      openapi: OPENAPI_VERSION,
      info: {
        title: DOCUMENT_TEXT.title,
        summary: DOCUMENT_TEXT.summary,
        description: DOCUMENT_TEXT.description,
        version: API_CONTRACT_VERSION,
        license: {
          name: DOCUMENT_TEXT.license,
          identifier: DOCUMENT_TEXT.license,
        },
      },
      servers: options.servers.map((server) => ({ ...server })),
      tags: Object.values(TAGS).map((name) => ({ name })),
      paths: pathsOf(options.routes ?? API_ROUTES),
      components: {
        schemas: { ...NAMED_SCHEMAS },
        securitySchemes: {
          [SECURITY.oidc]: {
            type: 'openIdConnect',
            openIdConnectUrl: oidcDiscovery(options.oidcIssuerUrl),
            description: DOCUMENT_TEXT.oidc,
          },
          [SECURITY.operatorKey]: {
            type: 'http',
            scheme: 'bearer',
            description: DOCUMENT_TEXT.operatorKey,
          },
          [SECURITY.streamTicket]: {
            type: 'apiKey',
            in: 'query',
            name: DOCUMENT_TEXT.streamTicketParam,
            description: DOCUMENT_TEXT.streamTicket,
          },
        },
      },
    },
    { reused: 'inline' },
  );

export type OpenApiDocument = ReturnType<typeof createDocument>;

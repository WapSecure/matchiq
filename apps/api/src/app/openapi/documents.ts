import { type ApiEnv, DEFAULT_URLS } from '@matchiq/config';
import { API_GLOBAL_PREFIX } from '@matchiq/server-kit';
import { buildOpenApiDocument, type OpenApiDocument } from './build-document';
import { DOCUMENT_TEXT } from './openapi.constants';

const serverUrl = (origin: string): string =>
  `${new URL(origin).origin}/${API_GLOBAL_PREFIX}`;

/** The committed `docs/api/openapi.json`: config defaults only, so it is reproducible. */
export const committedDocument = (): OpenApiDocument =>
  buildOpenApiDocument({
    servers: [
      {
        url: serverUrl(DEFAULT_URLS.apiPublic),
        description: DOCUMENT_TEXT.localServer,
      },
    ],
  });

/** What `GET /openapi.json` serves: this deployment's public URL and issuer. */
export const servedDocument = (env: ApiEnv): OpenApiDocument =>
  buildOpenApiDocument({
    servers: [
      {
        url: serverUrl(env.API_PUBLIC_URL),
        description: DOCUMENT_TEXT.configuredServer,
      },
    ],
  });

export const serializeDocument = (document: OpenApiDocument): string =>
  `${JSON.stringify(document, null, 2)}\n`;

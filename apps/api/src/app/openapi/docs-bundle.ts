import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ApiEnv } from '@matchiq/config';
import { API_GLOBAL_PREFIX } from '@matchiq/server-kit';
import { serializeDocument, servedDocument } from './documents';
import {
  DOCS_ASSETS,
  DOCS_ROUTES,
  type DocsAssetName,
  MEDIA,
} from './openapi.constants';

export interface DocsAsset {
  readonly body: string;
  readonly type: string;
}

/** Everything the docs routes serve, built once at startup. */
export interface DocsBundle {
  readonly document: string;
  readonly page: string;
  readonly assets: Readonly<Record<DocsAssetName, DocsAsset>>;
}

export const DOCS_BUNDLE = Symbol('DOCS_BUNDLE');

const base = `/${API_GLOBAL_PREFIX}`;
const assetUrl = (name: DocsAssetName) => `${base}/${DOCS_ROUTES.ui}/${name}`;

const page = (): string =>
  [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<title>MatchIQ API reference</title>',
    `<link rel="stylesheet" href="${assetUrl('swagger-ui.css')}">`,
    '</head>',
    '<body>',
    '<div id="swagger-ui"></div>',
    `<script src="${assetUrl('swagger-ui-bundle.js')}"></script>`,
    `<script src="${assetUrl('docs-init.js')}"></script>`,
    '</body>',
    '</html>',
    '',
  ].join('\n');

/** External file so the page needs no inline script under its CSP; no validator call-out. */
const initScript = (): string =>
  `window.ui = SwaggerUIBundle(${JSON.stringify({
    url: `${base}/${DOCS_ROUTES.document}`,
    dom_id: '#swagger-ui',
    deepLinking: true,
    validatorUrl: null,
  })});\n`;

const swaggerDir = async (): Promise<string> => {
  const { default: getAbsoluteFSPath } =
    await import('swagger-ui-dist/absolute-path.js');
  return getAbsoluteFSPath();
};

export const loadDocsBundle = async (env: ApiEnv): Promise<DocsBundle> => {
  const dir = await swaggerDir();
  const read = async (name: DocsAssetName): Promise<DocsAsset> => {
    const { file, type } = DOCS_ASSETS[name];
    const body = file ? await readFile(join(dir, file), 'utf8') : initScript();
    return { body, type };
  };
  return {
    document: serializeDocument(servedDocument(env)),
    page: page(),
    assets: {
      'swagger-ui.css': await read('swagger-ui.css'),
      'swagger-ui-bundle.js': await read('swagger-ui-bundle.js'),
      'docs-init.js': await read('docs-init.js'),
    },
  };
};

export const DOCS_MEDIA = { document: MEDIA.json, page: MEDIA.html } as const;

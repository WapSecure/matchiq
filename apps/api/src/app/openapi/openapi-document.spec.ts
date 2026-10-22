import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PROBLEM_TYPE_PREFIX } from '@matchiq/server-kit';
import { committedDocument, serializeDocument } from './documents';
import {
  API_CONTRACT_VERSION,
  COMMITTED_DOCUMENT_PATH,
  DOCUMENT_WRITE_FLAG,
} from './openapi.constants';
import { API_ROUTES } from './routes';

const WORKSPACE = join(__dirname, '..', '..', '..', '..', '..');
const COMMITTED = join(WORKSPACE, COMMITTED_DOCUMENT_PATH);

type Operation = {
  operationId: string;
  security: unknown[];
  responses: Record<
    string,
    { content?: Record<string, unknown> } & Record<string, unknown>
  >;
};

const operations = (): Operation[] =>
  Object.values(committedDocument().paths ?? {}).flatMap((item) =>
    Object.values(item as Record<string, Operation>),
  );

describe('OpenAPI document', () => {
  // `pnpm nx run api:openapi` sets the flag to regenerate the committed file.
  if (process.env[DOCUMENT_WRITE_FLAG] === '1') {
    it('writes docs/api/openapi.json', () => {
      writeFileSync(COMMITTED, serializeDocument(committedDocument()));
    });
    return;
  }

  it('matches the committed docs/api/openapi.json (run `pnpm nx run api:openapi`)', () => {
    expect(readFileSync(COMMITTED, 'utf8')).toBe(
      serializeDocument(committedDocument()),
    );
  });

  it('is OpenAPI 3.1 versioned from the API package', () => {
    const pkg = JSON.parse(
      readFileSync(join(WORKSPACE, 'apps', 'api', 'package.json'), 'utf8'),
    ) as { version: string };
    const document = committedDocument();
    expect(document.openapi).toBe('3.1.0');
    expect(document.info.version).toBe(API_CONTRACT_VERSION);
    expect(API_CONTRACT_VERSION).toBe(pkg.version);
  });

  it('documents every registry route exactly once with a unique operationId', () => {
    const ids = operations().map((op) => op.operationId);
    expect(ids).toHaveLength(API_ROUTES.length);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every operation problem responses with matchiq type URIs', () => {
    for (const op of operations()) {
      expect(op.responses['429']).toBeDefined();
      expect(op.responses['500']).toBeDefined();
      for (const [status, response] of Object.entries(op.responses)) {
        if (Number(status) < 400 || !response['x-problem-types']) continue;
        expect(response.content).toHaveProperty(['application/problem+json']);
        for (const type of response['x-problem-types'] as string[]) {
          expect(type.startsWith(PROBLEM_TYPE_PREFIX)).toBe(true);
        }
      }
    }
  });

  it('lists OIDC and the operator key, plus anonymous only where the demo principal may call', () => {
    const byId = new Map(operations().map((op) => [op.operationId, op]));
    const signedIn = [{ oidc: [] }, { operatorKey: [] }];
    expect(byId.get('createFixture')?.security).toEqual(signedIn);
    expect(byId.get('freezeFixture')?.security).toEqual(signedIn);
    expect(byId.get('getFixture')?.security).toEqual([...signedIn, {}]);
    expect(byId.get('streamFixture')?.security).toEqual([
      ...signedIn,
      { streamTicket: [] },
      {},
    ]);
    expect(byId.get('getLiveness')?.security).toEqual([]);
    expect(byId.get('createFixture')).toHaveProperty(
      ['x-matchiq-permission'],
      'fixtures:write',
    );
    expect(byId.get('createFixture')?.responses['401']).toBeDefined();
    expect(byId.get('getLiveness')?.responses['401']).toBeUndefined();
  });

  it('documents the stream as text/event-stream carrying StreamMessage', () => {
    const document = committedDocument();
    const stream = operations().find(
      (op) => op.operationId === 'streamFixture',
    );
    expect(stream?.responses['200']?.content).toEqual({
      'text/event-stream': {
        schema: { type: 'string' },
        'x-sse-data': { $ref: '#/components/schemas/StreamMessage' },
      },
    });
    expect(document.components?.schemas).toHaveProperty('StreamMessage');
  });

  it('declares the OIDC, operator-key and stream-ticket schemes', () => {
    const schemes = committedDocument().components?.securitySchemes ?? {};
    expect(schemes).toHaveProperty(['oidc', 'type'], 'openIdConnect');
    expect(schemes).toHaveProperty(['operatorKey', 'scheme'], 'bearer');
    expect(schemes).toHaveProperty(['streamTicket', 'in'], 'query');
  });
});

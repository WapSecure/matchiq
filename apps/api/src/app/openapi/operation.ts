import { ProblemDetails } from '@matchiq/contracts';
import { z } from 'zod';
import type {
  ZodOpenApiOperationObject,
  ZodOpenApiResponseObject,
  ZodOpenApiResponsesObject,
} from 'zod-openapi';
import {
  HEADER,
  IdempotencyKeyParam,
  IdempotentReplayedHeader,
  LastEventIdParam,
  RequestIdHeader,
  RequestIdParam,
  RetryAfterHeader,
} from './components';
import { ACCESS, EXTENSIONS, MEDIA, SECURITY } from './openapi.constants';
import {
  ALWAYS,
  problemEntry,
  type ProblemEntry,
  type ProblemRef,
  problemType,
} from './problem-catalog';
import type { ApiRoute, SuccessBody } from './route-types';

const STREAM_MESSAGE_REF = { $ref: '#/components/schemas/StreamMessage' };
const TEXT = { type: 'string' } as const;
/** Statuses whose problems carry `Retry-After`. */
const RETRY_STATUSES = new Set([429, 503]);

const content = (body: SuccessBody) => {
  if (body.kind === 'json') return { [MEDIA.json]: { schema: body.schema } };
  if (body.kind === 'raw') return { [body.mediaType]: { schema: TEXT } };
  return {
    [MEDIA.eventStream]: {
      schema: TEXT,
      [EXTENSIONS.streamMessage]: STREAM_MESSAGE_REF,
    },
  };
};

const successHeaders = (route: ApiRoute) =>
  z.object({
    [HEADER.requestId]: RequestIdHeader,
    ...(route.idempotent
      ? { [HEADER.idempotentReplayed]: IdempotentReplayedHeader }
      : {}),
  });

const problemResponse = (
  status: number,
  entries: readonly ProblemEntry[],
): ZodOpenApiResponseObject => ({
  description: entries.map((e) => `\`${e.slug}\`: ${e.title}`).join('; '),
  headers: z.object({
    [HEADER.requestId]: RequestIdHeader,
    ...(RETRY_STATUSES.has(status)
      ? { [HEADER.retryAfter]: RetryAfterHeader.optional() }
      : {}),
  }),
  content: {
    [MEDIA.problem]: {
      schema: ProblemDetails,
      examples: Object.fromEntries(
        entries.map((e) => [
          e.slug,
          {
            summary: e.title,
            value: { type: problemType(e.slug), title: e.title, status },
          },
        ]),
      ),
    },
  },
  [EXTENSIONS.problemTypes]: entries.map((e) => problemType(e.slug)),
});

const groupByStatus = (refs: readonly ProblemRef[]) => {
  const groups = new Map<number, ProblemEntry[]>();
  for (const ref of new Set([...refs, ...ALWAYS])) {
    const entry = problemEntry(ref);
    groups.set(entry.status, [...(groups.get(entry.status) ?? []), entry]);
  }
  return [...groups.entries()].sort(([a], [b]) => a - b);
};

const responsesOf = (route: ApiRoute): ZodOpenApiResponsesObject => {
  const success = {
    headers: successHeaders(route),
    content: content(route.success.body),
  };
  const successes = [route.success, ...(route.alsoSucceedsWith ?? [])].map(
    ({ status, description }) =>
      [String(status), { description, ...success }] as const,
  );
  const problems = groupByStatus(route.problems).map(
    ([status, entries]) =>
      [String(status), problemResponse(status, entries)] as const,
  );
  return Object.fromEntries<ZodOpenApiResponseObject>([
    ...successes,
    ...problems,
  ]);
};

const ACCESS_TEXT: Record<ApiRoute['auth']['kind'], (r: ApiRoute) => string> = {
  public: () => ACCESS.public,
  operator: () => ACCESS.operator,
  permission: (r) =>
    r.auth.kind === 'permission' ? ACCESS.permission(r.auth.permission) : '',
};

const securityOf = (route: ApiRoute) =>
  route.auth.kind === 'public' ? [] : [{ [SECURITY.operatorKey]: [] }];

const headerParams = (route: ApiRoute) => [
  RequestIdParam,
  ...(route.idempotent ? [IdempotencyKeyParam] : []),
  ...(route.success.body.kind === 'stream' ? [LastEventIdParam] : []),
];

export const operationOf = (route: ApiRoute): ZodOpenApiOperationObject => ({
  operationId: route.operationId,
  summary: route.summary,
  description: [route.description, ACCESS_TEXT[route.auth.kind](route)]
    .filter(Boolean)
    .join('\n\n'),
  tags: [route.tag],
  security: securityOf(route),
  ...(route.auth.kind === 'permission'
    ? { [EXTENSIONS.permission]: route.auth.permission }
    : {}),
  ...(route.conditional ? { [EXTENSIONS.conditional]: route.conditional } : {}),
  parameters: headerParams(route),
  requestParams: {
    ...(route.params ? { path: route.params } : {}),
    ...(route.query ? { query: route.query } : {}),
  },
  ...(route.body
    ? {
        requestBody: {
          required: true,
          content: { [MEDIA.json]: { schema: route.body } },
        },
      }
    : {}),
  responses: responsesOf(route),
});

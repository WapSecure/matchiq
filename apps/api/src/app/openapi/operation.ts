import { ANONYMOUS_ROLE, ROLE_PERMISSIONS } from '@matchiq/access';
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
  GUARDED,
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

const ANONYMOUS = new Set<string>(ROLE_PERMISSIONS[ANONYMOUS_ROLE]);

const content = (body: SuccessBody) => {
  if (body.kind === 'none') return undefined;
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

const groupByStatus = (route: ApiRoute) => {
  const groups = new Map<number, ProblemEntry[]>();
  const guarded = route.auth === 'public' ? [] : GUARDED;
  const refs: ProblemRef[] = [...guarded, ...route.problems, ...ALWAYS];
  for (const ref of new Set(refs)) {
    const entry = problemEntry(ref);
    groups.set(entry.status, [...(groups.get(entry.status) ?? []), entry]);
  }
  return [...groups.entries()].sort(([a], [b]) => a - b);
};

const responsesOf = (route: ApiRoute): ZodOpenApiResponsesObject => {
  const body = content(route.success.body);
  const success = {
    headers: successHeaders(route),
    ...(body ? { content: body } : {}),
  };
  const successes = [route.success, ...(route.alsoSucceedsWith ?? [])].map(
    ({ status, description }) =>
      [String(status), { description, ...success }] as const,
  );
  const problems = groupByStatus(route).map(
    ([status, entries]) =>
      [String(status), problemResponse(status, entries)] as const,
  );
  return Object.fromEntries<ZodOpenApiResponseObject>([
    ...successes,
    ...problems,
  ]);
};

const anonymousAllowed = (route: ApiRoute): boolean =>
  route.auth === 'authenticated' || ANONYMOUS.has(route.auth);

const accessText = (route: ApiRoute): string => {
  if (route.auth === 'public') return ACCESS.public;
  if (route.auth === 'authenticated') return ACCESS.authenticated;
  return ACCESS.permission(route.auth, anonymousAllowed(route));
};

/** Alternatives: OIDC, the dev/CI operator key, a stream ticket on `/stream`, and `{}` when the anonymous demo may call it. */
const securityOf = (route: ApiRoute) => {
  if (route.auth === 'public') return [];
  const schemes: Record<string, string[]>[] = [
    { [SECURITY.oidc]: [] },
    { [SECURITY.operatorKey]: [] },
  ];
  if (route.success.body.kind === 'stream')
    schemes.push({ [SECURITY.streamTicket]: [] });
  return anonymousAllowed(route) ? [...schemes, {}] : schemes;
};

const headerParams = (route: ApiRoute) => [
  RequestIdParam,
  ...(route.idempotent ? [IdempotencyKeyParam] : []),
  ...(route.success.body.kind === 'stream' ? [LastEventIdParam] : []),
];

export const operationOf = (route: ApiRoute): ZodOpenApiOperationObject => ({
  operationId: route.operationId,
  summary: route.summary,
  description: [route.description, accessText(route)]
    .filter(Boolean)
    .join('\n\n'),
  tags: [route.tag],
  security: securityOf(route),
  ...(route.auth === 'public' ? {} : { [EXTENSIONS.permission]: route.auth }),
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

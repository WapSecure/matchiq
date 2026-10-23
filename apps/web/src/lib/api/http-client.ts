import type { z } from 'zod';
import {
  API_LIMITS,
  HTTP_HEADERS,
  HTTP_STATUS,
  MEDIA_TYPES,
} from '@/constants/api';
import { AUTH_ROUTES } from '@/constants/auth';
import { useSession, whenSessionKnown } from '@/lib/auth/session-store';
import { apiUrl } from '@/lib/env';
import {
  httpError,
  invalidResponseError,
  networkError,
  timeoutError,
} from './api-error';

export type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT';
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  query?: Record<string, string | number | undefined>;
};

const NO_CONTENT = 204;

const withQuery = (path: string, query: RequestOptions['query']): string => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) params.set(key, String(value));
  }
  const search = params.toString();
  return search ? `${path}?${search}` : path;
};

const readBody = async (response: Response): Promise<unknown> => {
  if (response.status === NO_CONTENT) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw invalidResponseError('Response body is not JSON');
  }
};

const send = async (path: string, options: RequestOptions) => {
  await whenSessionKnown();
  const timeout = AbortSignal.timeout(API_LIMITS.requestTimeoutMs);
  const signal = options.signal
    ? AbortSignal.any([options.signal, timeout])
    : timeout;
  const hasBody = options.body !== undefined;
  const url = apiUrl(withQuery(path, options.query));
  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method ?? 'GET',
      headers: {
        [HTTP_HEADERS.accept]: `${MEDIA_TYPES.json}, ${MEDIA_TYPES.problem}`,
        ...(hasBody ? { [HTTP_HEADERS.contentType]: MEDIA_TYPES.json } : {}),
        ...options.headers,
      },
      body: hasBody ? JSON.stringify(options.body) : undefined,
      signal,
    });
  } catch (error) {
    if (timeout.aborted) throw timeoutError();
    throw networkError(error instanceof Error ? error.message : undefined);
  }
  // A 401 from the BFF means the session is gone; the UI then says so once.
  if (
    response.status === HTTP_STATUS.unauthorized &&
    url.startsWith(AUTH_ROUTES.bff)
  )
    useSession.getState().markExpired();
  return response;
};

export const describeIssues = (error: z.ZodError): string =>
  error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('; ');

/** Fetches JSON and validates it against a contract before returning it. */
export const requestJson = async <S extends z.ZodType>(
  path: string,
  schema: S,
  options: RequestOptions = {},
): Promise<z.infer<S>> => {
  const response = await send(path, options);
  const body = await readBody(response);
  if (!response.ok) throw httpError(response.status, body, response.headers);
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw invalidResponseError(describeIssues(parsed.error));
  return parsed.data;
};

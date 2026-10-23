import { type ApiClient, createApiClient } from '@matchiq/api-client';
import type { z } from 'zod';
import { API_LIMITS, HTTP_HEADERS, MEDIA_TYPES } from '@/constants/api';
import { whenSessionKnown } from '@/lib/auth/session-store';
import { apiUrl } from '@/lib/env';
import {
  httpError,
  invalidResponseError,
  isApiError,
  networkError,
  timeoutError,
} from './api-error';
import { describeIssues } from './http-client';

const BODYLESS = new Set(['GET', 'HEAD']);

/**
 * Same call shape, timeout and error mapping as `requestJson`: a URL string
 * and init, read from `globalThis.fetch` per call.
 */
const timedFetch = async (request: Request): Promise<Response> => {
  const timeout = AbortSignal.timeout(API_LIMITS.requestTimeoutMs);
  const body = BODYLESS.has(request.method) ? undefined : await request.text();
  try {
    return await fetch(request.url, {
      method: request.method,
      headers: Object.fromEntries(request.headers),
      body,
      signal: AbortSignal.any([request.signal, timeout]),
    });
  } catch (error) {
    if (timeout.aborted) throw timeoutError();
    throw networkError(error instanceof Error ? error.message : undefined);
  }
};

/**
 * Generated from `docs/api/openapi.json`. Built per call because the base URL
 * depends on the session: the API directly, or the BFF once signed in.
 */
const apiClient = async (): Promise<ApiClient> => {
  await whenSessionKnown();
  return createApiClient({
    baseUrl: apiUrl(''),
    fetch: timedFetch,
    headers: {
      [HTTP_HEADERS.accept]: `${MEDIA_TYPES.json}, ${MEDIA_TYPES.problem}`,
    },
  });
};

interface TypedResult {
  readonly data?: unknown;
  readonly error?: unknown;
  readonly response: Response;
}

/** Runs a typed call, then validates its body against the Zod contract. */
export const validated = async <S extends z.ZodType>(
  call: (client: ApiClient) => Promise<TypedResult>,
  schema: S,
): Promise<z.infer<S>> => {
  let result: TypedResult;
  try {
    result = await call(await apiClient());
  } catch (error) {
    if (isApiError(error)) throw error;
    throw invalidResponseError(
      error instanceof Error ? error.message : String(error),
    );
  }
  if (!result.response.ok) {
    throw httpError(
      result.response.status,
      result.error,
      result.response.headers,
    );
  }
  const parsed = schema.safeParse(result.data);
  if (!parsed.success) throw invalidResponseError(describeIssues(parsed.error));
  return parsed.data;
};

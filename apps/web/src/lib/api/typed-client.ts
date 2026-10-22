import { type ApiClient, createApiClient } from '@matchiq/api-client';
import type { z } from 'zod';
import { API_LIMITS, HTTP_HEADERS, MEDIA_TYPES } from '@/constants/api';
import { apiUrl } from '@/lib/env';
import {
  httpError,
  invalidResponseError,
  isApiError,
  networkError,
  timeoutError,
} from './api-error';
import { describeIssues } from './http-client';

/** Reads `globalThis.fetch` per call, with the same timeout and error mapping as `requestJson`. */
const timedFetch = async (request: Request): Promise<Response> => {
  const timeout = AbortSignal.timeout(API_LIMITS.requestTimeoutMs);
  try {
    return await fetch(request, {
      signal: AbortSignal.any([request.signal, timeout]),
    });
  } catch (error) {
    if (timeout.aborted) throw timeoutError();
    throw networkError(error instanceof Error ? error.message : undefined);
  }
};

/** Generated from `docs/api/openapi.json`; the migration of the other endpoints is tracked in docs/api/README.md. */
export const apiClient: ApiClient = createApiClient({
  baseUrl: apiUrl(''),
  fetch: timedFetch,
  headers: {
    [HTTP_HEADERS.accept]: `${MEDIA_TYPES.json}, ${MEDIA_TYPES.problem}`,
  },
});

interface TypedResult {
  readonly data?: unknown;
  readonly error?: unknown;
  readonly response: Response;
}

/** Runs a typed call, then validates its body against the Zod contract. */
export const validated = async <S extends z.ZodType>(
  call: () => Promise<TypedResult>,
  schema: S,
): Promise<z.infer<S>> => {
  let result: TypedResult;
  try {
    result = await call();
  } catch (error) {
    if (isApiError(error)) throw error;
    throw invalidResponseError(
      error instanceof Error ? error.message : String(error),
    );
  }
  if (!result.response.ok) {
    throw httpError(result.response.status, result.error);
  }
  const parsed = schema.safeParse(result.data);
  if (!parsed.success) throw invalidResponseError(describeIssues(parsed.error));
  return parsed.data;
};

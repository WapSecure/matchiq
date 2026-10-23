import { ProblemDetails } from '@matchiq/contracts';
import {
  DELTA_SECONDS,
  PROBLEM_FALLBACK,
  RETRY_AFTER_HEADER,
} from '@/constants/api';

export type ApiErrorKind = 'network' | 'timeout' | 'invalidResponse' | 'http';

const CLIENT_SIDE_STATUS = {
  network: 503,
  timeout: 504,
  invalid: 502,
} as const;
const SERVER_ERROR_MIN = 500;

/** Every failed API call surfaces as RFC 9457 problem details. */
export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly problem: ProblemDetails;
  /** Seconds from `Retry-After`, when the API sent one. */
  readonly retryAfterSeconds: number | null;

  constructor(
    kind: ApiErrorKind,
    problem: ProblemDetails,
    retryAfterSeconds: number | null = null,
  ) {
    super(problem.title);
    this.name = 'ApiError';
    this.kind = kind;
    this.problem = problem;
    this.retryAfterSeconds = retryAfterSeconds;
  }

  get status(): number {
    return this.problem.status;
  }

  get retryable(): boolean {
    return (
      this.kind !== 'invalidResponse' && this.problem.status >= SERVER_ERROR_MIN
    );
  }
}

export const networkError = (detail?: string): ApiError =>
  new ApiError('network', {
    ...PROBLEM_FALLBACK.network,
    status: CLIENT_SIDE_STATUS.network,
    detail,
  });

export const timeoutError = (): ApiError =>
  new ApiError('timeout', {
    ...PROBLEM_FALLBACK.timeout,
    status: CLIENT_SIDE_STATUS.timeout,
  });

export const invalidResponseError = (detail: string): ApiError =>
  new ApiError('invalidResponse', {
    ...PROBLEM_FALLBACK.invalidResponse,
    status: CLIENT_SIDE_STATUS.invalid,
    detail,
  });

const MS_PER_SECOND = 1_000;

/** `Retry-After` as delta-seconds or an HTTP date (RFC 9110 §10.2.3). */
export const parseRetryAfter = (
  value: string | null | undefined,
  nowMs = Date.now(),
): number | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (DELTA_SECONDS.test(trimmed)) return Number(trimmed);
  const at = Date.parse(trimmed);
  if (Number.isNaN(at)) return null;
  return Math.max(0, Math.ceil((at - nowMs) / MS_PER_SECOND));
};

export const httpError = (
  status: number,
  body: unknown,
  headers?: Headers,
): ApiError => {
  const parsed = ProblemDetails.safeParse(body);
  return new ApiError(
    'http',
    parsed.success ? parsed.data : { ...PROBLEM_FALLBACK.http, status },
    parseRetryAfter(headers?.get(RETRY_AFTER_HEADER)),
  );
};

export const isApiError = (value: unknown): value is ApiError =>
  value instanceof ApiError;

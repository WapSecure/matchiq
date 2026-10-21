import { ProblemDetails } from '@matchiq/contracts';
import { PROBLEM_FALLBACK } from '@/constants/api';

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

  constructor(kind: ApiErrorKind, problem: ProblemDetails) {
    super(problem.detail ?? problem.title);
    this.name = 'ApiError';
    this.kind = kind;
    this.problem = problem;
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

export const httpError = (status: number, body: unknown): ApiError => {
  const parsed = ProblemDetails.safeParse(body);
  return new ApiError(
    'http',
    parsed.success ? parsed.data : { ...PROBLEM_FALLBACK.http, status },
  );
};

export const isApiError = (value: unknown): value is ApiError =>
  value instanceof ApiError;

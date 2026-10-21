export const REQUEST_ID_HEADER = 'x-request-id';
export const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;
export const PROBLEM_CONTENT_TYPE = 'application/problem+json';
export const PROBLEM_TYPE_PREFIX = 'urn:matchiq:problem:';
export const API_GLOBAL_PREFIX = 'api/v1';
export const HEALTH_ROUTE = 'health';
export const HEALTH_CHECK_TIMEOUT_MS = 2_000;

export const PROBLEM_TITLES = {
  validation: 'Request validation failed',
  internal: 'Internal server error',
  timeout: 'Health check timed out',
} as const;

export const PROBLEM_SLUGS: Readonly<Record<number, string>> = {
  400: 'bad-request',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not-found',
  409: 'conflict',
  422: 'validation-failed',
  429: 'rate-limited',
  500: 'internal-error',
  503: 'dependency-unavailable',
};

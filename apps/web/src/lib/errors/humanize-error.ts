import {
  ERROR_COPY,
  type ErrorCopy,
  type ErrorKind,
  type RecoveryAction,
} from '@/constants/errors';
import { PROBLEM_COPY } from '@/constants/problem-copy';
import { isApiError, type ApiError } from '@/lib/api/api-error';

export type HumanError = {
  kind: ErrorKind;
  title: string;
  message: string;
  action: RecoveryAction;
  /** True when the copy is about this exact problem, not its category. */
  specific: boolean;
  /** True when the title should replace the surface's own heading (specific, offline, signed out). */
  headline: boolean;
  support: boolean;
  /** The request id, shown only as a small copyable "Reference". */
  reference: string | null;
  /** Seconds to wait before retrying, for `wait` actions. */
  retryAfterSeconds: number | null;
};

const SERVER_ERROR_MIN = 500;

/** These say more than any surface heading could, so they lead. */
const HEADLINE_KINDS: ReadonlySet<ErrorKind> = new Set([
  'offline',
  'sessionExpired',
]);
const SLUG_SEPARATOR = ':';

const STATUS_KIND: Readonly<Record<number, ErrorKind>> = {
  400: 'invalid',
  401: 'sessionExpired',
  403: 'forbidden',
  404: 'notFound',
  409: 'conflict',
  422: 'invalid',
  429: 'rateLimited',
  503: 'unavailable',
};

const slugOf = (type: string): string =>
  type.slice(type.lastIndexOf(SLUG_SEPARATOR) + 1);

const isOffline = (): boolean =>
  typeof navigator !== 'undefined' && navigator.onLine === false;

const statusKind = (status: number): ErrorKind =>
  STATUS_KIND[status] ?? (status >= SERVER_ERROR_MIN ? 'server' : 'unexpected');

const kindOf = (error: ApiError): ErrorKind => {
  if (error.kind === 'network') return isOffline() ? 'offline' : 'network';
  if (error.kind === 'timeout') return 'timeout';
  if (error.kind === 'invalidResponse') return 'server';
  return statusKind(error.status);
};

type Resolved = { kind: ErrorKind; copy: ErrorCopy; specific: boolean };

const resolve = (error: ApiError): Resolved => {
  const base = kindOf(error);
  // Offline and timeouts describe the connection, whatever the slug says.
  if (error.kind !== 'http') {
    return { kind: base, copy: ERROR_COPY[base], specific: false };
  }
  const entry = PROBLEM_COPY[slugOf(error.problem.type)];
  if (entry === undefined)
    return { kind: base, copy: ERROR_COPY[base], specific: false };
  if (typeof entry === 'string')
    return { kind: entry, copy: ERROR_COPY[entry], specific: false };
  return { kind: base, copy: entry, specific: true };
};

const fromCopy = (
  kind: ErrorKind,
  copy: ErrorCopy,
  extra: Partial<HumanError> = {},
): HumanError => ({
  kind,
  title: copy.title,
  message: copy.message,
  action: copy.action,
  specific: false,
  headline: HEADLINE_KINDS.has(kind),
  support: copy.support ?? false,
  reference: null,
  retryAfterSeconds: null,
  ...extra,
});

/**
 * Turns any failure into words a producer, analyst or fan understands, plus
 * one recovery action. Problem `detail`, URNs, status codes and library
 * messages are never part of the result.
 */
export const humanizeError = (error: unknown): HumanError => {
  if (!isApiError(error)) {
    const kind: ErrorKind = isOffline() ? 'offline' : 'unexpected';
    return fromCopy(kind, ERROR_COPY[kind]);
  }
  const { kind, copy, specific } = resolve(error);
  return fromCopy(kind, copy, {
    specific,
    headline: specific || HEADLINE_KINDS.has(kind),
    reference: error.problem.requestId ?? null,
    retryAfterSeconds: copy.action === 'wait' ? error.retryAfterSeconds : null,
  });
};

/** True when the failure means the user's sign-in has ended. */
export const isSessionExpired = (error: unknown): boolean =>
  humanizeError(error).kind === 'sessionExpired';

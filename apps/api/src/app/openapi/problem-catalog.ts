import { HttpStatus } from '@nestjs/common';
import { PROBLEMS as AUTH_PROBLEMS } from '@matchiq/auth';
import {
  PROBLEM_SLUGS,
  PROBLEM_TITLES,
  PROBLEM_TYPE_PREFIX,
} from '@matchiq/server-kit';
import { PROBLEMS } from '../constants';
import { PROBLEM_STATUS, type ProblemKind } from '../http/problems';

export interface ProblemEntry {
  readonly status: number;
  readonly slug: string;
  readonly title: string;
}

/** Problems raised by the shared HTTP kit and the auth guards rather than a route's service. */
const GENERIC = {
  unauthorized: {
    status: HttpStatus.UNAUTHORIZED,
    ...AUTH_PROBLEMS.unauthorized,
  },
  forbidden: { status: HttpStatus.FORBIDDEN, ...AUTH_PROBLEMS.forbidden },
  authUnavailable: {
    status: HttpStatus.SERVICE_UNAVAILABLE,
    ...AUTH_PROBLEMS.authUnavailable,
  },
  badRequest: {
    status: HttpStatus.BAD_REQUEST,
    slug: PROBLEM_SLUGS[HttpStatus.BAD_REQUEST] ?? '',
    title: 'Malformed request body',
  },
  validation: {
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    slug: PROBLEM_SLUGS[HttpStatus.UNPROCESSABLE_ENTITY] ?? '',
    title: PROBLEM_TITLES.validation,
  },
  rateLimited: {
    status: HttpStatus.TOO_MANY_REQUESTS,
    slug: PROBLEM_SLUGS[HttpStatus.TOO_MANY_REQUESTS] ?? '',
    title: 'Too many requests',
  },
  internal: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    slug: PROBLEM_SLUGS[HttpStatus.INTERNAL_SERVER_ERROR] ?? '',
    title: PROBLEM_TITLES.internal,
  },
} as const satisfies Record<string, ProblemEntry>;

export type GenericProblem = keyof typeof GENERIC;
export type ProblemRef = ProblemKind | GenericProblem;

export const problemEntry = (ref: ProblemRef): ProblemEntry =>
  ref in GENERIC
    ? GENERIC[ref as GenericProblem]
    : {
        status: PROBLEM_STATUS[ref as ProblemKind],
        ...PROBLEMS[ref as ProblemKind],
      };

export const problemType = (slug: string): string =>
  `${PROBLEM_TYPE_PREFIX}${slug}`;

/** Every route can answer these; routes list only what their own handler adds. */
export const ALWAYS: readonly ProblemRef[] = ['rateLimited', 'internal'];

/** Added by the authentication and permission guards to every non-public route. */
export const GUARDED: readonly ProblemRef[] = [
  'unauthorized',
  'forbidden',
  'authUnavailable',
];

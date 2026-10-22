import { HttpStatus } from '@nestjs/common';
import type { Permission } from '@matchiq/access';
import { ProblemException } from '@matchiq/server-kit';
import {
  AUTH_FAILURES,
  type AuthFailureReason,
  BEARER_ERRORS,
  FAILURE_DETAILS,
  FORBIDDEN_DETAIL,
  HEADERS,
  PROBLEMS,
  REALM,
} from '../constants';

/** RFC 6750 §3: no error code when no credential was sent at all. */
const challenge = (reason: AuthFailureReason): string =>
  reason === AUTH_FAILURES.missing
    ? `Bearer realm="${REALM}"`
    : `Bearer realm="${REALM}", error="${BEARER_ERRORS.invalidToken}", error_description="${FAILURE_DETAILS[reason]}"`;

export const unauthorizedProblem = (
  reason: AuthFailureReason,
): ProblemException =>
  new ProblemException({
    status: HttpStatus.UNAUTHORIZED,
    ...PROBLEMS.unauthorized,
    detail: FAILURE_DETAILS[reason],
    headers: { [HEADERS.wwwAuthenticate]: challenge(reason) },
  });

export const forbiddenProblem = (permission: Permission): ProblemException =>
  new ProblemException({
    status: HttpStatus.FORBIDDEN,
    ...PROBLEMS.forbidden,
    detail: FORBIDDEN_DETAIL(permission),
    headers: {
      [HEADERS.wwwAuthenticate]: `Bearer realm="${REALM}", error="${BEARER_ERRORS.insufficientScope}", scope="${permission}"`,
    },
  });

export const undeclaredRouteProblem = (): ProblemException =>
  new ProblemException({
    status: HttpStatus.FORBIDDEN,
    ...PROBLEMS.undeclared,
  });

export const authUnavailableProblem = (): ProblemException =>
  new ProblemException({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    ...PROBLEMS.authUnavailable,
  });

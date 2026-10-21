import { createHash, timingSafeEqual } from 'node:crypto';
import {
  applyDecorators,
  type CanActivate,
  type ExecutionContext,
  HttpStatus,
  Inject,
  Injectable,
  UseGuards,
} from '@nestjs/common';
import type { ApiEnv } from '@matchiq/config';
import { APP_ENV, ProblemException } from '@matchiq/server-kit';
import type { Request } from 'express';
import { AUTH, AUTH_DETAILS, HEADERS, PROBLEMS } from '../constants';

const digest = (value: string): Buffer =>
  createHash('sha256').update(value).digest();

/**
 * Compares SHA-256 digests so both buffers have equal length and the
 * comparison time does not depend on where the keys differ.
 */
export const operatorKeyMatches = (
  presented: string,
  expected: string,
): boolean => timingSafeEqual(digest(presented), digest(expected));

const unauthorized = (detail: string): ProblemException =>
  new ProblemException({
    status: HttpStatus.UNAUTHORIZED,
    ...PROBLEMS.unauthorized,
    detail,
    headers: { [HEADERS.wwwAuthenticate]: AUTH.challenge },
  });

/** ADR-0010: operator-only routes require the bearer key; reads stay anonymous. */
@Injectable()
export class OperatorAuthGuard implements CanActivate {
  constructor(@Inject(APP_ENV) private readonly env: ApiEnv) {}

  canActivate(context: ExecutionContext): boolean {
    const header = context
      .switchToHttp()
      .getRequest<Request>()
      .header(HEADERS.authorization);
    if (!header?.startsWith(AUTH.bearerPrefix)) {
      throw unauthorized(AUTH_DETAILS.missing);
    }
    const token = header.slice(AUTH.bearerPrefix.length).trim();
    if (!operatorKeyMatches(token, this.env.OPERATOR_API_KEY)) {
      throw unauthorized(AUTH_DETAILS.invalid);
    }
    return true;
  }
}

export const OperatorOnly = () => applyDecorators(UseGuards(OperatorAuthGuard));

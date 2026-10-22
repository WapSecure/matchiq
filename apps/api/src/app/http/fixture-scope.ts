import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import { type AuthenticatedRequest, principalOf } from '@matchiq/auth';
import type { FixtureKey } from '@matchiq/db';
import { ZodValidationPipe } from '@matchiq/server-kit';
import { ROUTE_PARAMS } from '../constants';
import { FixtureIdParam } from '../fixtures/fixtures.schemas';

const fixtureIdPipe = new ZodValidationPipe(FixtureIdParam);

/**
 * `{ orgId, fixtureId }` for the `:fixtureId` route: the id from the path,
 * the organisation from the caller's principal and nowhere else (ADR-0015).
 */
export const FixtureScope = createParamDecorator(
  (_data: unknown, context: ExecutionContext): FixtureKey => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    return {
      orgId: principalOf(request).orgId,
      fixtureId: fixtureIdPipe.transform(
        request.params[ROUTE_PARAMS.fixtureId],
      ),
    };
  },
);

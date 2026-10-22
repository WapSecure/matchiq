import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import type { Observable } from 'rxjs';
import { annotateLogContext } from './log-context';
import {
  ACTOR_REQUEST_FIELD,
  FIXTURE_ROUTE_PARAM,
} from './telemetry.constants';

/**
 * Runs after routing and guards, so it can add the fixture from the path and
 * the org of the authenticated actor (never a client-supplied org) to the log
 * context the request-id middleware opened.
 */
@Injectable()
export class LogContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() === 'http') {
      const req = context.switchToHttp().getRequest<Request>();
      const fixtureId = req.params?.[FIXTURE_ROUTE_PARAM];
      const actor = (
        req as unknown as Record<string, { orgId?: string } | undefined>
      )[ACTOR_REQUEST_FIELD];
      annotateLogContext({
        fixtureId: typeof fixtureId === 'string' ? fixtureId : undefined,
        orgId: actor?.orgId,
      });
    }
    return next.handle();
  }
}

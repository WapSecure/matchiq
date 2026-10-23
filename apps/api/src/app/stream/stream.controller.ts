import {
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Principal } from '@matchiq/access';
import {
  AcceptsStreamTicket,
  CurrentPrincipal,
  RequirePermission,
  STREAM_TICKETS,
  StreamTickets,
} from '@matchiq/auth';
import type { StreamTicket } from '@matchiq/contracts';
import type { FixtureKey } from '@matchiq/db';
import { ZodValidationPipe } from '@matchiq/server-kit';
import type { Response } from 'express';
import {
  HEADER_ERRORS,
  HEADERS,
  PATTERNS,
  ROUTE_PARAMS,
  ROUTES,
} from '../constants';
import { StreamQuery } from '../fixtures/fixtures.schemas';
import { FixturesService } from '../fixtures/fixtures.service';
import { FixtureScope } from '../http/fixture-scope';
import { problem } from '../http/problems';
import { SseWriter } from './sse-writer';
import { StreamService } from './stream.service';

/** The header wins over `?lastEventId=`, which exists for clients that cannot set headers. */
const resolveLastEventId = (
  header: string | undefined,
  query: StreamQuery,
): number | undefined => {
  if (header === undefined) return query.lastEventId;
  if (!PATTERNS.nonNegativeInteger.test(header.trim())) {
    throw problem('invalidHeader', {
      errors: [
        {
          path: HEADERS.lastEventId,
          message: HEADER_ERRORS.notNonNegativeInteger,
        },
      ],
    });
  }
  return Number(header.trim());
};

@Controller(ROUTES.fixtures)
export class StreamController {
  constructor(
    private readonly fixtures: FixturesService,
    private readonly streams: StreamService,
    @Inject(STREAM_TICKETS) private readonly tickets: StreamTickets,
  ) {}

  /** Bearer token, or `?ticket=` from `stream-tickets` for clients that cannot send headers. */
  @Get(ROUTES.stream)
  @RequirePermission('fixtures:read')
  @AcceptsStreamTicket(ROUTE_PARAMS.fixtureId)
  async stream(
    @FixtureScope() key: FixtureKey,
    @Query(new ZodValidationPipe(StreamQuery)) query: StreamQuery,
    @Headers(HEADERS.lastEventId) lastEventIdHeader: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    await this.streams.open({
      key,
      lastEventId: resolveLastEventId(lastEventIdHeader, query),
      sink: new SseWriter(res),
      onDisconnect: (callback) => res.on('close', callback),
    });
  }

  /** Short-lived, bound to this fixture and organisation (ADR-0018). */
  @Post(ROUTES.streamTickets)
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('fixtures:read')
  async ticket(
    @FixtureScope() key: FixtureKey,
    @CurrentPrincipal() principal: Principal,
  ): Promise<StreamTicket> {
    await this.fixtures.get(key);
    return this.tickets.issue(principal, key.fixtureId);
  }
}

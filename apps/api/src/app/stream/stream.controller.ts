import { Controller, Get, Headers, Param, Query, Res } from '@nestjs/common';
import { ZodValidationPipe } from '@matchiq/server-kit';
import type { Response } from 'express';
import {
  HEADER_ERRORS,
  HEADERS,
  PATTERNS,
  ROUTE_PARAMS,
  ROUTES,
} from '../constants';
import { FixtureIdParam, StreamQuery } from '../fixtures/fixtures.schemas';
import { FixturesService } from '../fixtures/fixtures.service';
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
  ) {}

  @Get(ROUTES.stream)
  async stream(
    @Param(ROUTE_PARAMS.fixtureId, new ZodValidationPipe(FixtureIdParam))
    fixtureId: string,
    @Query(new ZodValidationPipe(StreamQuery)) query: StreamQuery,
    @Headers(HEADERS.lastEventId) lastEventIdHeader: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    await this.streams.open({
      key: this.fixtures.keyOf(fixtureId),
      lastEventId: resolveLastEventId(lastEventIdHeader, query),
      sink: new SseWriter(res),
      onDisconnect: (callback) => res.on('close', callback),
    });
  }
}

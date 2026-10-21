import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import {
  Fixture,
  IngestBatchRequest,
  type IngestBatchResponse,
} from '@matchiq/contracts';
import { ZodValidationPipe } from '@matchiq/server-kit';
import type { Response } from 'express';
import { OperatorOnly } from '../auth/operator-auth.guard';
import { HEADERS, ROUTE_PARAMS, ROUTES } from '../constants';
import { parseIdempotencyKey } from '../http/idempotency';
import { respond } from '../http/respond';
import { IngestService } from '../ingest/ingest.service';
import {
  EventPageQuery,
  FixtureIdParam,
  FixtureListQuery,
} from './fixtures.schemas';
import {
  type EventPage,
  type FixtureList,
  FixturesService,
} from './fixtures.service';

const fixtureIdPipe = new ZodValidationPipe(FixtureIdParam);

@Controller(ROUTES.fixtures)
export class FixturesController {
  constructor(
    private readonly fixtures: FixturesService,
    private readonly ingestion: IngestService,
  ) {}

  @Post()
  @OperatorOnly()
  async create(
    @Body(new ZodValidationPipe(Fixture)) fixture: Fixture,
    @Headers(HEADERS.idempotencyKey) idempotencyKey: string | undefined,
    @Headers(HEADERS.requestId) requestId: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Fixture> {
    const result = await this.fixtures.create({
      fixture,
      requestId,
      idempotencyKey: parseIdempotencyKey(idempotencyKey),
    });
    return respond(res, result);
  }

  @Get()
  list(
    @Query(new ZodValidationPipe(FixtureListQuery)) query: FixtureListQuery,
  ): Promise<FixtureList> {
    return this.fixtures.list(query);
  }

  @Get(ROUTES.fixture)
  get(
    @Param(ROUTE_PARAMS.fixtureId, fixtureIdPipe) fixtureId: string,
  ): Promise<Fixture> {
    return this.fixtures.get(fixtureId);
  }

  @Get(ROUTES.events)
  events(
    @Param(ROUTE_PARAMS.fixtureId, fixtureIdPipe) fixtureId: string,
    @Query(new ZodValidationPipe(EventPageQuery)) query: EventPageQuery,
  ): Promise<EventPage> {
    return this.fixtures.listEvents(fixtureId, query);
  }

  @Post(ROUTES.eventsBatch)
  @OperatorOnly()
  async ingest(
    @Param(ROUTE_PARAMS.fixtureId, fixtureIdPipe) fixtureId: string,
    @Body(new ZodValidationPipe(IngestBatchRequest)) batch: IngestBatchRequest,
    @Headers() headers: Record<string, string | undefined>,
    @Res({ passthrough: true }) res: Response,
  ): Promise<IngestBatchResponse> {
    const result = await this.ingestion.ingest({
      key: this.fixtures.keyOf(fixtureId),
      batch,
      requestId: headers[HEADERS.requestId],
      idempotencyKey: parseIdempotencyKey(headers[HEADERS.idempotencyKey]),
    });
    return respond(res, result);
  }
}

import { Body, Controller, Get, Param, Post, Query, Res } from '@nestjs/common';
import type { Principal } from '@matchiq/access';
import { CurrentPrincipal, RequirePermission } from '@matchiq/auth';
import {
  Fixture,
  IngestBatchRequest,
  type IngestBatchResponse,
} from '@matchiq/contracts';
import { ZodValidationPipe } from '@matchiq/server-kit';
import type { Response } from 'express';
import { ROUTE_PARAMS, ROUTES } from '../constants';
import { Caller, type CallerContext } from '../http/caller-context';
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
  @RequirePermission('fixtures:write')
  async create(
    @Body(new ZodValidationPipe(Fixture)) fixture: Fixture,
    @Caller() caller: CallerContext,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Fixture> {
    return respond(res, await this.fixtures.create({ ...caller, fixture }));
  }

  @Get()
  @RequirePermission('fixtures:read')
  list(
    @Query(new ZodValidationPipe(FixtureListQuery)) query: FixtureListQuery,
    @CurrentPrincipal() principal: Principal,
  ): Promise<FixtureList> {
    return this.fixtures.list(principal.orgId, query);
  }

  @Get(ROUTES.fixture)
  @RequirePermission('fixtures:read')
  get(
    @Param(ROUTE_PARAMS.fixtureId, fixtureIdPipe) fixtureId: string,
    @CurrentPrincipal() principal: Principal,
  ): Promise<Fixture> {
    return this.fixtures.get({ orgId: principal.orgId, fixtureId });
  }

  @Get(ROUTES.events)
  @RequirePermission('fixtures:read')
  events(
    @Param(ROUTE_PARAMS.fixtureId, fixtureIdPipe) fixtureId: string,
    @Query(new ZodValidationPipe(EventPageQuery)) query: EventPageQuery,
    @CurrentPrincipal() principal: Principal,
  ): Promise<EventPage> {
    return this.fixtures.listEvents(
      { orgId: principal.orgId, fixtureId },
      query,
    );
  }

  @Post(ROUTES.eventsBatch)
  @RequirePermission('events:ingest')
  async ingest(
    @Param(ROUTE_PARAMS.fixtureId, fixtureIdPipe) fixtureId: string,
    @Body(new ZodValidationPipe(IngestBatchRequest)) batch: IngestBatchRequest,
    @Caller() caller: CallerContext,
    @Res({ passthrough: true }) res: Response,
  ): Promise<IngestBatchResponse> {
    const result = await this.ingestion.ingest({
      key: { orgId: caller.principal.orgId, fixtureId },
      batch,
      principal: caller.principal,
      ...(caller.requestId === undefined
        ? {}
        : { requestId: caller.requestId }),
      ...(caller.idempotencyKey === undefined
        ? {}
        : { idempotencyKey: caller.idempotencyKey }),
    });
    return respond(res, result);
  }
}

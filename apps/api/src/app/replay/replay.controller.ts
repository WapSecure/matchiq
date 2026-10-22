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
import type { Response } from 'express';
import { ReplayCommand, type ReplayStatus } from '@matchiq/contracts';
import type {
  CreatedSession,
  FixtureTemplateSummary,
  ReplaySessionView,
} from '@matchiq/db';
import { ZodValidationPipe } from '@matchiq/server-kit';
import { HEADERS, ROUTE_PARAMS, ROUTES } from '../constants';
import { parseIdempotencyKey } from '../http/idempotency';
import { respond } from '../http/respond';
import { FixtureIdParam } from '../fixtures/fixtures.schemas';
import { ReplayThrottled } from './replay-throttle';
import { CreateSessionBody, SessionListQuery } from './replay.schemas';
import { type ItemList, ReplayService } from './replay.service';

const fixtureIdPipe = new ZodValidationPipe(FixtureIdParam);

@Controller(ROUTES.fixtures)
export class ReplayController {
  constructor(private readonly replay: ReplayService) {}

  /** Starts a new session of a template: a fresh fixture and ledger fed at `speed`. */
  @Post(ROUTES.sessions)
  @ReplayThrottled()
  async createSession(
    @Param(ROUTE_PARAMS.fixtureId, fixtureIdPipe) templateId: string,
    @Body(new ZodValidationPipe(CreateSessionBody)) body: CreateSessionBody,
    @Headers(HEADERS.idempotencyKey) idempotencyKey: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<CreatedSession> {
    const result = await this.replay.createSession({
      templateId,
      speed: body.speed,
      idempotencyKey: parseIdempotencyKey(idempotencyKey),
    });
    return respond(res, result);
  }

  @Post(ROUTES.replay)
  @ReplayThrottled()
  async command(
    @Param(ROUTE_PARAMS.fixtureId, fixtureIdPipe) sessionId: string,
    @Body(new ZodValidationPipe(ReplayCommand)) command: ReplayCommand,
    @Headers(HEADERS.idempotencyKey) idempotencyKey: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ReplayStatus> {
    const result = await this.replay.command({
      sessionId,
      command,
      idempotencyKey: parseIdempotencyKey(idempotencyKey),
    });
    return respond(res, result);
  }

  @Get(ROUTES.replay)
  status(
    @Param(ROUTE_PARAMS.fixtureId, fixtureIdPipe) sessionId: string,
  ): Promise<ReplayStatus> {
    return this.replay.status(sessionId);
  }
}

/** The lobby: templates to start and sessions to join. */
@Controller()
export class LobbyController {
  constructor(private readonly replay: ReplayService) {}

  @Get(ROUTES.fixtureTemplates)
  templates(): Promise<ItemList<FixtureTemplateSummary>> {
    return this.replay.listTemplates();
  }

  @Get(ROUTES.replaySessions)
  sessions(
    @Query(new ZodValidationPipe(SessionListQuery)) query: SessionListQuery,
  ): Promise<ItemList<ReplaySessionView>> {
    return this.replay.listSessions(query.limit);
  }
}

import { Body, Controller, Get, Param, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import type { Principal } from '@matchiq/access';
import { CurrentPrincipal, RequirePermission } from '@matchiq/auth';
import { ReplayCommand, type ReplayStatus } from '@matchiq/contracts';
import type {
  CreatedSession,
  FixtureTemplateSummary,
  ReplaySessionView,
} from '@matchiq/db';
import { ZodValidationPipe } from '@matchiq/server-kit';
import { AuditTrail } from '../auth/audit-trail.service';
import {
  API_AUDIT_ACTIONS,
  AUDIT_TARGETS,
  ROUTE_PARAMS,
  ROUTES,
} from '../constants';
import { Caller, type CallerContext } from '../http/caller-context';
import { respond } from '../http/respond';
import { FixtureIdParam } from '../fixtures/fixtures.schemas';
import { ReplayThrottled } from './replay-throttle';
import { CreateSessionBody, SessionListQuery } from './replay.schemas';
import { type ItemList, ReplayService } from './replay.service';

const fixtureIdPipe = new ZodValidationPipe(FixtureIdParam);

@Controller(ROUTES.fixtures)
export class ReplayController {
  constructor(
    private readonly replay: ReplayService,
    private readonly audit: AuditTrail,
  ) {}

  /** Starts a new session of a template: a fresh fixture and ledger fed at `speed`. */
  @Post(ROUTES.sessions)
  @RequirePermission('replay:control')
  @ReplayThrottled()
  async createSession(
    @Param(ROUTE_PARAMS.fixtureId, fixtureIdPipe) templateId: string,
    @Body(new ZodValidationPipe(CreateSessionBody)) body: CreateSessionBody,
    @Caller() caller: CallerContext,
    @Res({ passthrough: true }) res: Response,
  ): Promise<CreatedSession> {
    const result = await this.replay.createSession({
      ...caller,
      templateId,
      speed: body.speed,
      ...(body.faultPlan && { faultPlan: body.faultPlan }),
    });
    return respond(res, result);
  }

  @Post(ROUTES.replay)
  @RequirePermission('replay:control')
  @ReplayThrottled()
  async command(
    @Param(ROUTE_PARAMS.fixtureId, fixtureIdPipe) sessionId: string,
    @Body(new ZodValidationPipe(ReplayCommand)) command: ReplayCommand,
    @Caller() caller: CallerContext,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ReplayStatus> {
    const result = await this.replay.command({
      ...caller,
      sessionId,
      command,
    });
    if (!result.replayed) {
      await this.audit.record(caller.principal, {
        action: API_AUDIT_ACTIONS.replayCommand,
        targetType: AUDIT_TARGETS.fixture,
        targetId: sessionId,
        ...(caller.requestId === undefined
          ? {}
          : { requestId: caller.requestId }),
        details: { command },
      });
    }
    return respond(res, result);
  }

  @Get(ROUTES.replay)
  @RequirePermission('fixtures:read')
  status(
    @Param(ROUTE_PARAMS.fixtureId, fixtureIdPipe) sessionId: string,
    @CurrentPrincipal() principal: Principal,
  ): Promise<ReplayStatus> {
    return this.replay.status(principal.orgId, sessionId);
  }
}

/** The lobby: templates to start and sessions to join. */
@Controller()
export class LobbyController {
  constructor(private readonly replay: ReplayService) {}

  @Get(ROUTES.fixtureTemplates)
  @RequirePermission('fixtures:read')
  templates(
    @CurrentPrincipal() principal: Principal,
  ): Promise<ItemList<FixtureTemplateSummary>> {
    return this.replay.listTemplates(principal.orgId);
  }

  @Get(ROUTES.replaySessions)
  @RequirePermission('fixtures:read')
  sessions(
    @Query(new ZodValidationPipe(SessionListQuery)) query: SessionListQuery,
    @CurrentPrincipal() principal: Principal,
  ): Promise<ItemList<ReplaySessionView>> {
    return this.replay.listSessions(principal.orgId, query.limit);
  }
}

import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import {
  InsightId,
  OverlayId,
  type EditorialStatus,
  type EditorialStatusResult,
  type KillSwitchResult,
  type KillSwitchStatus,
  type RetractOverlayResult,
  type SuppressInsightResult,
} from '@matchiq/contracts';
import { ZodValidationPipe } from '@matchiq/server-kit';
import type { Response } from 'express';
import { RequirePermission } from '../auth/permissions.guard';
import { ROUTE_PARAMS, ROUTES } from '../constants';
import { FixtureIdParam } from '../fixtures/fixtures.schemas';
import { respond } from '../http/respond';
import { EditorialContext } from './command-context';
import { EditorialControlsService } from './editorial-controls.service';
import type { CommandContext } from './editorial-writes';
import { EditorialService } from './editorial.service';

const fixtureIdPipe = new ZodValidationPipe(FixtureIdParam);

/** Single-item producer actions (spec §45). */
@Controller()
export class EditorialController {
  constructor(private readonly editorial: EditorialService) {}

  @Post(`${ROUTES.overlayResource}/${ROUTES.overlayRetract}`)
  @HttpCode(HttpStatus.OK)
  @RequirePermission('editorial:publish')
  async retract(
    @Param(ROUTE_PARAMS.overlayId, new ZodValidationPipe(OverlayId))
    overlayId: string,
    @EditorialContext() ctx: CommandContext,
    @Res({ passthrough: true }) res: Response,
  ): Promise<RetractOverlayResult> {
    return respond(res, await this.editorial.retractOverlay(overlayId, ctx));
  }

  @Post(`${ROUTES.insightResource}/${ROUTES.insightSuppress}`)
  @HttpCode(HttpStatus.OK)
  @RequirePermission('editorial:approve')
  async suppress(
    @Param(ROUTE_PARAMS.insightId, new ZodValidationPipe(InsightId))
    insightId: string,
    @EditorialContext() ctx: CommandContext,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SuppressInsightResult> {
    return respond(res, await this.editorial.suppressInsight(insightId, ctx));
  }
}

/** Session freeze and the organisation kill switch. */
@Controller()
export class EditorialControlsController {
  constructor(private readonly controls: EditorialControlsService) {}

  /** Public: viewers render a "graphics paused" state from this and `editorial.status`. */
  @Get(`${ROUTES.fixtures}/${ROUTES.editorial}`)
  status(
    @Param(ROUTE_PARAMS.fixtureId, fixtureIdPipe) fixtureId: string,
  ): Promise<EditorialStatus> {
    return this.controls.status(fixtureId);
  }

  @Post(`${ROUTES.fixtures}/${ROUTES.editorialFreeze}`)
  @HttpCode(HttpStatus.OK)
  @RequirePermission('editorial:publish')
  async freeze(
    @Param(ROUTE_PARAMS.fixtureId, fixtureIdPipe) fixtureId: string,
    @EditorialContext() ctx: CommandContext,
    @Res({ passthrough: true }) res: Response,
  ): Promise<EditorialStatusResult> {
    return respond(res, await this.controls.setFreeze(fixtureId, true, ctx));
  }

  @Post(`${ROUTES.fixtures}/${ROUTES.editorialResume}`)
  @HttpCode(HttpStatus.OK)
  @RequirePermission('editorial:publish')
  async resume(
    @Param(ROUTE_PARAMS.fixtureId, fixtureIdPipe) fixtureId: string,
    @EditorialContext() ctx: CommandContext,
    @Res({ passthrough: true }) res: Response,
  ): Promise<EditorialStatusResult> {
    return respond(res, await this.controls.setFreeze(fixtureId, false, ctx));
  }

  @Get(ROUTES.killSwitch)
  killSwitch(): Promise<KillSwitchStatus> {
    return this.controls.killSwitch();
  }

  @Post(ROUTES.killSwitchActivate)
  @HttpCode(HttpStatus.OK)
  @RequirePermission('editorial:publish')
  async activate(
    @EditorialContext() ctx: CommandContext,
    @Res({ passthrough: true }) res: Response,
  ): Promise<KillSwitchResult> {
    return respond(res, await this.controls.setKillSwitch(true, ctx));
  }

  @Post(ROUTES.killSwitchRelease)
  @HttpCode(HttpStatus.OK)
  @RequirePermission('editorial:publish')
  async release(
    @EditorialContext() ctx: CommandContext,
    @Res({ passthrough: true }) res: Response,
  ): Promise<KillSwitchResult> {
    return respond(res, await this.controls.setKillSwitch(false, ctx));
  }
}

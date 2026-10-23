import {
  Body,
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
  ReviewInsightCommand,
  SetPublishPolicyCommand,
  type EditorialStatusResult,
  type OverlayReviewList,
  type ReviewInsightResult,
} from '@matchiq/contracts';
import { ZodValidationPipe } from '@matchiq/server-kit';
import type { Response } from 'express';
import type { Actor } from '../auth/actor';
import { CurrentActor, RequirePermission } from '../auth/permissions.guard';
import { ROUTE_PARAMS, ROUTES } from '../constants';
import { FixtureIdParam } from '../fixtures/fixtures.schemas';
import { respond } from '../http/respond';
import { RequestCommandContext } from './command-context';
import type { RequestContext } from './editorial-writes';
import { PublishPolicyService } from './publish-policy.service';
import { ReviewService } from './review.service';

const fixtureIdPipe = new ZodValidationPipe(FixtureIdParam);

/** Approve-before-air: the producer's queue, reviews and the session policy (ADR-0022). */
@Controller()
export class ReviewController {
  constructor(
    private readonly reviews: ReviewService,
    private readonly policy: PublishPolicyService,
  ) {}

  @Get(`${ROUTES.fixtures}/${ROUTES.overlayReviews}`)
  @RequirePermission('editorial:approve')
  queue(
    @Param(ROUTE_PARAMS.fixtureId, fixtureIdPipe) fixtureId: string,
    @CurrentActor() actor: Actor,
  ): Promise<OverlayReviewList> {
    return this.reviews.queue(actor.orgId, fixtureId);
  }

  @Post(`${ROUTES.insightResource}/${ROUTES.insightReview}`)
  @HttpCode(HttpStatus.OK)
  @RequirePermission('editorial:approve')
  async review(
    @Param(ROUTE_PARAMS.insightId, new ZodValidationPipe(InsightId))
    insightId: string,
    @Body(new ZodValidationPipe(ReviewInsightCommand))
    command: ReviewInsightCommand,
    @RequestCommandContext() ctx: RequestContext,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ReviewInsightResult> {
    const withReason =
      command.reason === undefined ? ctx : { ...ctx, reason: command.reason };
    return respond(
      res,
      await this.reviews.review(insightId, command, withReason),
    );
  }

  @Post(`${ROUTES.fixtures}/${ROUTES.publishPolicy}`)
  @HttpCode(HttpStatus.OK)
  @RequirePermission('policy:configure')
  async setPolicy(
    @Param(ROUTE_PARAMS.fixtureId, fixtureIdPipe) fixtureId: string,
    @Body(new ZodValidationPipe(SetPublishPolicyCommand))
    command: SetPublishPolicyCommand,
    @RequestCommandContext() ctx: RequestContext,
    @Res({ passthrough: true }) res: Response,
  ): Promise<EditorialStatusResult> {
    return respond(
      res,
      await this.policy.set(fixtureId, command.policy, {
        ...ctx,
        reason: command.reason,
      }),
    );
  }
}

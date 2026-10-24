import { Controller, Get, Param } from '@nestjs/common';
import { InsightId, type EvidenceEnvelope } from '@matchiq/contracts';
import { ZodValidationPipe } from '@matchiq/server-kit';
import type { Actor } from '../auth/actor';
import { CurrentActor, RequirePermission } from '../auth/permissions.guard';
import { ROUTE_PARAMS, ROUTES } from '../constants';
import { IntelligenceService } from './intelligence.service';

@Controller(ROUTES.insightResource)
export class InsightEvidenceController {
  constructor(private readonly intelligence: IntelligenceService) {}

  @Get(ROUTES.insightEvidence)
  @RequirePermission('insights:read')
  evidence(
    @Param(ROUTE_PARAMS.insightId, new ZodValidationPipe(InsightId))
    insightId: string,
    @CurrentActor() actor: Actor,
  ): Promise<EvidenceEnvelope> {
    return this.intelligence.evidence(actor.orgId, insightId);
  }
}

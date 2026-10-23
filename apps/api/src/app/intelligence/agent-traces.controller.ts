import { Controller, Get, Param } from '@nestjs/common';
import { RequirePermission } from '@matchiq/auth';
import { type AgentStepTrace, CorrelationId } from '@matchiq/contracts';
import { ZodValidationPipe } from '@matchiq/server-kit';
import { ROUTE_PARAMS, ROUTES } from '../constants';
import { Caller, type CallerContext } from '../http/caller-context';
import { IntelligenceService } from './intelligence.service';

/** Spec §29: per-run agent handoff records for the Observatory. */
@Controller(ROUTES.agentTraces)
export class AgentTracesController {
  constructor(private readonly intelligence: IntelligenceService) {}

  @Get(ROUTES.agentTrace)
  @RequirePermission('agents:traces:read')
  trace(
    @Caller() caller: CallerContext,
    @Param(ROUTE_PARAMS.correlationId, new ZodValidationPipe(CorrelationId))
    correlationId: string,
  ): Promise<AgentStepTrace> {
    return this.intelligence.stepTrace(caller.principal.orgId, correlationId);
  }
}

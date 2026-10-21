import { Controller, Get, Param, Query } from '@nestjs/common';
import type {
  Insight,
  MatchSnapshot,
  Narrative,
  OverlayCue,
} from '@matchiq/contracts';
import type { InsightTrace, RecapDocument } from '@matchiq/db';
import { ZodValidationPipe } from '@matchiq/server-kit';
import { ROUTE_PARAMS, ROUTES } from '../constants';
import { FixtureIdParam } from '../fixtures/fixtures.schemas';
import type { ItemList } from '../replay/replay.service';
import { NarrativeQuery } from './intelligence.schemas';
import { IntelligenceService } from './intelligence.service';

const fixtureIdPipe = new ZodValidationPipe(FixtureIdParam);

@Controller(ROUTES.fixtures)
export class IntelligenceController {
  constructor(private readonly intelligence: IntelligenceService) {}

  @Get(ROUTES.state)
  state(
    @Param(ROUTE_PARAMS.fixtureId, fixtureIdPipe) fixtureId: string,
  ): Promise<MatchSnapshot> {
    return this.intelligence.state(fixtureId);
  }

  @Get(ROUTES.insights)
  insights(
    @Param(ROUTE_PARAMS.fixtureId, fixtureIdPipe) fixtureId: string,
  ): Promise<ItemList<Insight>> {
    return this.intelligence.insights(fixtureId);
  }

  @Get(ROUTES.narratives)
  narratives(
    @Param(ROUTE_PARAMS.fixtureId, fixtureIdPipe) fixtureId: string,
    @Query(new ZodValidationPipe(NarrativeQuery)) query: NarrativeQuery,
  ): Promise<ItemList<Narrative>> {
    return this.intelligence.narratives(fixtureId, query);
  }

  @Get(ROUTES.overlays)
  overlays(
    @Param(ROUTE_PARAMS.fixtureId, fixtureIdPipe) fixtureId: string,
  ): Promise<ItemList<OverlayCue>> {
    return this.intelligence.overlays(fixtureId);
  }

  @Get(ROUTES.recap)
  recap(
    @Param(ROUTE_PARAMS.fixtureId, fixtureIdPipe) fixtureId: string,
  ): Promise<RecapDocument> {
    return this.intelligence.recap(fixtureId);
  }

  @Get(ROUTES.agentRuns)
  agentRuns(
    @Param(ROUTE_PARAMS.fixtureId, fixtureIdPipe) fixtureId: string,
  ): Promise<ItemList<InsightTrace>> {
    return this.intelligence.traces(fixtureId);
  }
}

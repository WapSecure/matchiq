import { Controller, Get, Query } from '@nestjs/common';
import { RequirePermission } from '@matchiq/auth';
import type {
  Insight,
  MatchSnapshot,
  Narrative,
  OverlayCue,
} from '@matchiq/contracts';
import type { FixtureKey, InsightTrace, RecapDocument } from '@matchiq/db';
import { ZodValidationPipe } from '@matchiq/server-kit';
import { ROUTES } from '../constants';
import { FixtureScope } from '../http/fixture-scope';
import type { ItemList } from '../replay/replay.service';
import { NarrativeQuery } from './intelligence.schemas';
import { IntelligenceService } from './intelligence.service';

@Controller(ROUTES.fixtures)
export class IntelligenceController {
  constructor(private readonly intelligence: IntelligenceService) {}

  @Get(ROUTES.state)
  @RequirePermission('fixtures:read')
  state(@FixtureScope() key: FixtureKey): Promise<MatchSnapshot> {
    return this.intelligence.state(key);
  }

  @Get(ROUTES.insights)
  @RequirePermission('insights:read')
  insights(@FixtureScope() key: FixtureKey): Promise<ItemList<Insight>> {
    return this.intelligence.insights(key);
  }

  /** Narratives are stored only once the gate publishes them. */
  @Get(ROUTES.narratives)
  @RequirePermission('insights:read')
  narratives(
    @FixtureScope() key: FixtureKey,
    @Query(new ZodValidationPipe(NarrativeQuery)) query: NarrativeQuery,
  ): Promise<ItemList<Narrative>> {
    return this.intelligence.narratives(key, query);
  }

  @Get(ROUTES.overlays)
  @RequirePermission('overlays:read')
  overlays(@FixtureScope() key: FixtureKey): Promise<ItemList<OverlayCue>> {
    return this.intelligence.overlays(key);
  }

  @Get(ROUTES.recap)
  @RequirePermission('insights:read')
  recap(@FixtureScope() key: FixtureKey): Promise<RecapDocument> {
    return this.intelligence.recap(key);
  }

  @Get(ROUTES.agentRuns)
  @RequirePermission('agents:traces:read')
  agentRuns(@FixtureScope() key: FixtureKey): Promise<ItemList<InsightTrace>> {
    return this.intelligence.traces(key);
  }
}

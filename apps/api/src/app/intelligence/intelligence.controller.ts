import { Controller, Get, Query } from '@nestjs/common';
import { RequirePermission } from '@matchiq/auth';
import type {
  CursorPage,
  Insight,
  MatchSnapshot,
  Narrative,
  OverlayCue,
} from '@matchiq/contracts';
import type { FixtureKey, InsightTrace, RecapDocument } from '@matchiq/db';
import { ZodValidationPipe } from '@matchiq/server-kit';
import { ROUTES } from '../constants';
import { FixtureScope } from '../http/fixture-scope';
import { MatchListQuery, NarrativeQuery } from './intelligence.schemas';
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
  insights(
    @FixtureScope() key: FixtureKey,
    @Query(new ZodValidationPipe(MatchListQuery)) query: MatchListQuery,
  ): Promise<CursorPage<Insight>> {
    return this.intelligence.insights(key, query);
  }

  /** Narratives are stored only once the gate publishes them. */
  @Get(ROUTES.narratives)
  @RequirePermission('insights:read')
  narratives(
    @FixtureScope() key: FixtureKey,
    @Query(new ZodValidationPipe(NarrativeQuery)) query: NarrativeQuery,
  ): Promise<CursorPage<Narrative>> {
    return this.intelligence.narratives(key, query);
  }

  @Get(ROUTES.overlays)
  @RequirePermission('overlays:read')
  overlays(
    @FixtureScope() key: FixtureKey,
    @Query(new ZodValidationPipe(MatchListQuery)) query: MatchListQuery,
  ): Promise<CursorPage<OverlayCue>> {
    return this.intelligence.overlays(key, query);
  }

  @Get(ROUTES.recap)
  @RequirePermission('insights:read')
  recap(@FixtureScope() key: FixtureKey): Promise<RecapDocument> {
    return this.intelligence.recap(key);
  }

  @Get(ROUTES.agentRuns)
  @RequirePermission('agents:traces:read')
  agentRuns(
    @FixtureScope() key: FixtureKey,
    @Query(new ZodValidationPipe(MatchListQuery)) query: MatchListQuery,
  ): Promise<CursorPage<InsightTrace>> {
    return this.intelligence.traces(key, query);
  }
}

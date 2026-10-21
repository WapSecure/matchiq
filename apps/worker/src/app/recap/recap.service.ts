import { Inject, Injectable } from '@nestjs/common';
import type {
  FixtureKey,
  FixtureReader,
  IntelligenceReader,
  PipelineUnitOfWork,
  RecapDocument,
} from '@matchiq/db';
import { buildRecap } from '../pipeline/recap-builder';
import {
  FIXTURE_READER,
  INTELLIGENCE_READER,
  PIPELINE_UOW,
} from '../infrastructure/tokens';

/**
 * Builds the MQ-013 recap from committed read models (final snapshot,
 * insights, published narratives) so narratives that land after MATCH_ENDED
 * are included when it is rebuilt.
 */
@Injectable()
export class RecapService {
  constructor(
    @Inject(INTELLIGENCE_READER) private readonly reader: IntelligenceReader,
    @Inject(FIXTURE_READER) private readonly fixtures: FixtureReader,
    @Inject(PIPELINE_UOW) private readonly uow: PipelineUnitOfWork,
  ) {}

  async rebuild(key: FixtureKey): Promise<RecapDocument | null> {
    const [snapshot, fixture, insights, narratives] = await Promise.all([
      this.reader.latestSnapshot(key),
      this.fixtures.get(key),
      this.reader.insightsWithPeriod(key),
      this.reader.narratives(key, {}),
    ]);
    if (
      snapshot === null ||
      fixture === null ||
      snapshot.phase !== 'COMPLETED'
    ) {
      return null;
    }
    const recap = buildRecap({
      fixtureId: key.fixtureId,
      title: fixture.title,
      snapshot,
      insights,
      narratives,
    });
    await this.uow.transaction((tx) => tx.saveRecap(key, recap));
    return recap;
  }
}

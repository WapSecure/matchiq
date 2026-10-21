import { Inject, Injectable } from '@nestjs/common';
import type { ApiEnv } from '@matchiq/config';
import type {
  Insight,
  MatchSnapshot,
  Narrative,
  OverlayCue,
} from '@matchiq/contracts';
import type {
  FixtureKey,
  FixtureReader,
  InsightTrace,
  IntelligenceReader,
  NarrativeFilter,
  RecapDocument,
} from '@matchiq/db';
import { APP_ENV } from '@matchiq/server-kit';
import { problem } from '../http/problems';
import { FIXTURE_READER, INTELLIGENCE_READER } from '../infrastructure/tokens';
import type { ItemList } from '../replay/replay.service';

/** Read models the worker's pipeline maintains; anonymous and read-only (ADR-0010). */
@Injectable()
export class IntelligenceService {
  constructor(
    @Inject(APP_ENV) private readonly env: ApiEnv,
    @Inject(FIXTURE_READER) private readonly fixtures: FixtureReader,
    @Inject(INTELLIGENCE_READER) private readonly reader: IntelligenceReader,
  ) {}

  async state(fixtureId: string): Promise<MatchSnapshot> {
    const snapshot = await this.reader.latestSnapshot(
      await this.known(fixtureId),
    );
    if (snapshot === null)
      throw problem('stateNotFound', { detail: fixtureId });
    return snapshot;
  }

  async insights(fixtureId: string): Promise<ItemList<Insight>> {
    return { items: await this.reader.insights(await this.known(fixtureId)) };
  }

  async narratives(
    fixtureId: string,
    filter: NarrativeFilter,
  ): Promise<ItemList<Narrative>> {
    const key = await this.known(fixtureId);
    return { items: await this.reader.narratives(key, filter) };
  }

  async overlays(fixtureId: string): Promise<ItemList<OverlayCue>> {
    return { items: await this.reader.overlays(await this.known(fixtureId)) };
  }

  async recap(fixtureId: string): Promise<RecapDocument> {
    const recap = await this.reader.recap(await this.known(fixtureId));
    if (recap === null) throw problem('recapNotReady', { detail: fixtureId });
    return recap;
  }

  /** Agent Observatory: per-insight runs and gate decisions; holds no prompts or secrets. */
  async traces(fixtureId: string): Promise<ItemList<InsightTrace>> {
    return { items: await this.reader.traces(await this.known(fixtureId)) };
  }

  private async known(fixtureId: string): Promise<FixtureKey> {
    const key = { orgId: this.env.DEMO_ORG_ID, fixtureId };
    if ((await this.fixtures.get(key)) === null) {
      throw problem('fixtureNotFound', { detail: fixtureId });
    }
    return key;
  }
}

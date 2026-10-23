import { Inject, Injectable } from '@nestjs/common';
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
import { problem } from '../http/problems';
import { FIXTURE_READER, INTELLIGENCE_READER } from '../infrastructure/tokens';
import type { ItemList } from '../replay/replay.service';

/** Read models the worker's pipeline maintains, scoped to the caller's organisation (ADR-0018). */
@Injectable()
export class IntelligenceService {
  constructor(
    @Inject(FIXTURE_READER) private readonly fixtures: FixtureReader,
    @Inject(INTELLIGENCE_READER) private readonly reader: IntelligenceReader,
  ) {}

  async state(key: FixtureKey): Promise<MatchSnapshot> {
    const snapshot = await this.reader.latestSnapshot(await this.known(key));
    if (snapshot === null)
      throw problem('stateNotFound', { detail: key.fixtureId });
    return snapshot;
  }

  async insights(key: FixtureKey): Promise<ItemList<Insight>> {
    return { items: await this.reader.insights(await this.known(key)) };
  }

  async narratives(
    key: FixtureKey,
    filter: NarrativeFilter,
  ): Promise<ItemList<Narrative>> {
    return {
      items: await this.reader.narratives(await this.known(key), filter),
    };
  }

  async overlays(key: FixtureKey): Promise<ItemList<OverlayCue>> {
    return { items: await this.reader.overlays(await this.known(key)) };
  }

  async recap(key: FixtureKey): Promise<RecapDocument> {
    const recap = await this.reader.recap(await this.known(key));
    if (recap === null)
      throw problem('recapNotReady', { detail: key.fixtureId });
    return recap;
  }

  /** Agent Observatory: per-insight runs and gate decisions; holds no prompts or secrets. */
  async traces(key: FixtureKey): Promise<ItemList<InsightTrace>> {
    return { items: await this.reader.traces(await this.known(key)) };
  }

  /** Another organisation's fixture answers the same 404 as a missing one. */
  private async known(key: FixtureKey): Promise<FixtureKey> {
    if ((await this.fixtures.get(key)) === null) {
      throw problem('fixtureNotFound', { detail: key.fixtureId });
    }
    return key;
  }
}

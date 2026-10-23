import { Inject, Injectable } from '@nestjs/common';
import type {
  CursorPage,
  CursorPageQuery,
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
  RecapDocument,
} from '@matchiq/db';
import { readPage } from '../http/cursor-page';
import { problem } from '../http/problems';
import { FIXTURE_READER, INTELLIGENCE_READER } from '../infrastructure/tokens';
import type { NarrativeQuery } from './intelligence.schemas';

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

  async insights(
    key: FixtureKey,
    query: CursorPageQuery,
  ): Promise<CursorPage<Insight>> {
    const known = await this.known(key);
    return readPage(() => this.reader.insightPage(known, query));
  }

  async narratives(
    key: FixtureKey,
    { persona, locale, ...query }: NarrativeQuery,
  ): Promise<CursorPage<Narrative>> {
    const known = await this.known(key);
    return readPage(() =>
      this.reader.narrativePage(known, { persona, locale }, query),
    );
  }

  async overlays(
    key: FixtureKey,
    query: CursorPageQuery,
  ): Promise<CursorPage<OverlayCue>> {
    const known = await this.known(key);
    return readPage(() => this.reader.overlayPage(known, query));
  }

  async recap(key: FixtureKey): Promise<RecapDocument> {
    const recap = await this.reader.recap(await this.known(key));
    if (recap === null)
      throw problem('recapNotReady', { detail: key.fixtureId });
    return recap;
  }

  /** Agent Observatory: per-insight runs and gate decisions; holds no prompts or secrets. */
  async traces(
    key: FixtureKey,
    query: CursorPageQuery,
  ): Promise<CursorPage<InsightTrace>> {
    const known = await this.known(key);
    return readPage(() => this.reader.tracePage(known, query));
  }

  /** Another organisation's fixture answers the same 404 as a missing one. */
  private async known(key: FixtureKey): Promise<FixtureKey> {
    if ((await this.fixtures.get(key)) === null) {
      throw problem('fixtureNotFound', { detail: key.fixtureId });
    }
    return key;
  }
}

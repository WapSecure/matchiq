import type { RecapDocument } from '@matchiq/db';
import { filterRecap } from './recap-filter';

const narrative = (persona: string, locale: string) => ({
  persona,
  locale,
  headline: `${persona} ${locale}`,
  body: 'Grounded copy.',
  source: 'TEMPLATE',
  citations: [],
});

const recap = {
  schemaVersion: 1,
  fixtureId: 'fx_unit',
  title: 'Full time',
  finalSnapshot: {},
  keyMoments: [
    {
      insightId: 'in_1',
      narratives: [
        narrative('CASUAL', 'en-GB'),
        narrative('CASUAL', 'fr-FR'),
        narrative('ANALYST', 'en-GB'),
      ],
    },
  ],
  story: [
    { persona: 'CASUAL', locale: 'en-GB', paragraphs: [] },
    { persona: 'ANALYST', locale: 'fr-FR', paragraphs: [] },
  ],
  synthetic: true,
} as unknown as RecapDocument;

describe('filterRecap', () => {
  it('returns the stored recap unchanged without persona or lang', () => {
    expect(filterRecap(recap, {})).toBe(recap);
  });

  it('keeps only the requested persona and language in narratives and story', () => {
    const filtered = filterRecap(recap, { persona: 'CASUAL', lang: 'fr-FR' });
    expect(filtered.keyMoments[0]?.narratives).toEqual([
      narrative('CASUAL', 'fr-FR'),
    ]);
    expect(filtered.story).toEqual([]);
    expect(filtered.keyMoments).toHaveLength(1);
  });

  it('filters on one parameter alone', () => {
    const byPersona = filterRecap(recap, { persona: 'CASUAL' });
    expect(byPersona.keyMoments[0]?.narratives).toHaveLength(2);
    expect(byPersona.story).toHaveLength(1);
    const byLang = filterRecap(recap, { lang: 'en-GB' });
    expect(byLang.keyMoments[0]?.narratives).toHaveLength(2);
  });
});

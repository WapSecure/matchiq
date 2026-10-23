import { act, render, screen } from '@testing-library/react';
import { RecapNarrative as RecapNarrativeSchema } from '@matchiq/contracts';
import { RECAP_COPY } from '@/constants/recap';
import { RecapDocument } from '@/lib/api/session-schemas';
import { moment, recap } from '@/test/session-factories';
import { fixture } from '@/test/factories';
import { STUDIO_UI_DEFAULTS, useStudioUi } from '@/features/studio/store';
import { RecapStory } from './recap-story';
import { buildReport } from './recap-report';
import { pickNarrative } from './pick-narrative';
import { RecapMomentItem } from './recap-moment';

const english = RecapNarrativeSchema.parse({
  persona: 'BROADCAST',
  locale: 'en-GB',
  headline: 'Home United level it',
  body: 'A header from the corner.',
  source: 'TEMPLATE',
  citations: ['ev_3'],
});
const french = {
  ...english,
  locale: 'fr-FR' as const,
  headline: 'Home United égalise',
  body: 'Une tête sur corner.',
};
const languageOf = (element: HTMLElement) =>
  element.closest('[lang]')?.getAttribute('lang');

const renderMoment = (narratives: ReturnType<typeof moment>['narratives']) =>
  render(
    <ul>
      <RecapMomentItem
        moment={moment({ narratives })}
        team={null}
        persona="BROADCAST"
        locale="fr-FR"
      />
    </ul>,
  );

describe('recap fallback provenance', () => {
  it('preserves the fallback flag when reading a recap API response', () => {
    const parsed = RecapDocument.parse(
      recap({
        keyMoments: [
          moment({
            narratives: [{ ...english, locale: 'fr-FR', localeFallback: true }],
          }),
        ],
      }),
    );
    expect(parsed.keyMoments[0]?.narratives[0]?.localeFallback).toBe(true);
  });

  it('marks a provider fallback as English and explains the missing translation', () => {
    renderMoment([{ ...english, locale: 'fr-FR', localeFallback: true }]);
    expect(languageOf(screen.getByText(english.headline))).toBe('en-GB');
    expect(
      languageOf(screen.getByText(RECAP_COPY.localeFallback('French'))),
    ).toBe('en-GB');
    expect(
      screen.queryByText(RECAP_COPY.translationUnknown),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Standard wording')).toBeInTheDocument();
  });

  it('keeps a confirmed French translation tagged as French', () => {
    renderMoment([{ ...french, localeFallback: false }]);
    expect(languageOf(screen.getByText(french.headline))).toBe('fr-FR');
    expect(
      screen.queryByText(RECAP_COPY.translationUnknown),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(RECAP_COPY.localeFallback('French')),
    ).not.toBeInTheDocument();
  });

  it('keeps legacy text with unknown language and explains its missing provenance', () => {
    renderMoment([french]);
    expect(languageOf(screen.getByText(french.headline))).toBe('und');
    expect(languageOf(screen.getByText(RECAP_COPY.translationUnknown))).toBe(
      'en-GB',
    );
    expect(
      screen.queryByText(RECAP_COPY.localeFallback('French')),
    ).not.toBeInTheDocument();
  });

  it('still uses the English variant when the requested variant is missing', () => {
    expect(pickNarrative([english], 'BROADCAST', 'fr-FR')).toMatchObject({
      narrative: english,
      fallback: true,
      translationUnknown: false,
      language: 'en-GB',
    });
  });

  it('does not cross audiences when a variant is unavailable', () => {
    expect(pickNarrative([english], 'CASUAL', 'fr-FR')).toBeNull();
  });
});

describe('story and readable report fallback provenance', () => {
  beforeEach(() =>
    act(() => useStudioUi.setState({ ...STUDIO_UI_DEFAULTS, locale: 'fr-FR' })),
  );
  afterEach(() => act(() => useStudioUi.setState({ ...STUDIO_UI_DEFAULTS })));

  it.each([
    { flag: true, language: 'en-GB', unknown: false, fallback: true },
    { flag: undefined, language: 'und', unknown: true, fallback: false },
  ])('keeps the story and report honest for $language commentary', (entry) => {
    const data = recap({
      keyMoments: [
        moment({
          narratives: [
            { ...english, locale: 'fr-FR', localeFallback: entry.flag },
          ],
        }),
      ],
    });
    render(<RecapStory recap={data} fixture={fixture()} />);
    expect(languageOf(screen.getByText(`${english.headline}.`))).toBe(
      entry.language,
    );
    const report = buildReport({
      recap: data,
      fixture: fixture(),
      persona: 'BROADCAST',
      locale: 'fr-FR',
    });
    expect(report.includes(RECAP_COPY.translationUnknown)).toBe(entry.unknown);
    expect(report.includes(RECAP_COPY.localeFallback('French'))).toBe(
      entry.fallback,
    );
    expect(report).toContain(english.body);
  });
});

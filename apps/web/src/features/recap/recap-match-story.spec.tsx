import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BREAKDOWN_COPY } from '@/constants/match';
import { RECAP_COPY, STORY_KIND_LABELS } from '@/constants/recap';
import { STUDIO_UI_DEFAULTS, useStudioUi } from '@/features/studio/store';
import { createQueryClient } from '@/lib/api/query-provider';
import { fixture } from '@/test/factories';
import { breakdown, moment, recap, story } from '@/test/session-factories';
import { stubApi } from '@/test/stub-api';
import { buildReport } from './recap-report';
import { RecapView } from './recap-view';

const french = story({
  locale: 'fr-FR',
  paragraphs: [
    {
      kind: 'TURNING_POINTS',
      text: 'Le match bascule sur corner.',
      citedValues: [],
      eventIds: ['ev_3'],
      insightIds: ['in_1'],
    },
  ],
});
const analyst = story({ persona: 'ANALYST' });
const parts = breakdown();
const analystMoment = moment({
  narratives: [
    ...moment().narratives,
    {
      persona: 'ANALYST',
      locale: 'en-GB',
      headline: 'Set-piece pressure pays off',
      body: 'The plain analyst write-up.',
      source: 'TEMPLATE',
      localeFallback: false,
      citations: ['ev_3'],
      breakdown: parts,
    },
  ],
});
const data = recap({
  keyMoments: [analystMoment],
  story: [story(), french, analyst],
});

const renderView = (body: unknown) => {
  stubApi({ 'GET /recap': { body } });
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <RecapView fixture={fixture()} />
    </QueryClientProvider>,
  );
};

describe('recap match story', () => {
  beforeEach(() => act(() => useStudioUi.setState({ ...STUDIO_UI_DEFAULTS })));
  afterEach(() => vi.unstubAllGlobals());

  it('tells the story above the key moments in the chosen audience and language', async () => {
    const user = userEvent.setup();
    renderView(data);
    const region = await screen.findByRole('region', {
      name: RECAP_COPY.matchStory.title,
    });
    const moments = screen.getByRole('list', { name: 'Key moments' });
    expect(
      region.compareDocumentPosition(moments) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      within(region).getByRole('heading', {
        name: STORY_KIND_LABELS.FIRST_HALF,
      }),
    ).toBeInTheDocument();
    expect(
      within(region).queryByText(STORY_KIND_LABELS.SECOND_HALF),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: /Français/ }));
    const translated = within(region).getByText('Le match bascule sur corner.');
    expect(translated.closest('[lang]')).toHaveAttribute('lang', 'fr-FR');
    expect(region).not.toHaveTextContent(RECAP_COPY.localeFallback('French'));
    await user.click(screen.getByRole('radio', { name: /Español/ }));
    expect(region).toHaveTextContent(RECAP_COPY.localeFallback('Spanish'));
    expect(
      within(region).getByText('Away City led at the break.').closest('[lang]'),
    ).toHaveAttribute('lang', 'en-GB');
    await user.click(screen.getByRole('radio', { name: 'Fan' }));
    expect(
      screen.queryByRole('region', { name: RECAP_COPY.matchStory.title }),
    ).not.toBeInTheDocument();
  });

  it('shows the analyst breakdown in the moment instead of the plain write-up', async () => {
    act(() => useStudioUi.setState({ persona: 'ANALYST' }));
    renderView(data);
    const moments = await screen.findByRole('list', { name: 'Key moments' });
    expect(within(moments).getByText(parts.whatHappened.text)).toBeVisible();
    expect(within(moments).getByText(parts.whatToWatch.text)).not.toBeVisible();
    expect(moments).not.toHaveTextContent('The plain analyst write-up.');
    expect(
      within(moments).getByRole('button', { name: BREAKDOWN_COPY.expand }),
    ).toHaveAttribute('aria-expanded', 'false');
  });

  it('leaves older recaps without a story section', async () => {
    renderView(recap());
    await screen.findByRole('list', { name: 'Key moments' });
    expect(
      screen.queryByRole('region', { name: RECAP_COPY.matchStory.title }),
    ).not.toBeInTheDocument();
  });
});

describe('match report story and breakdown', () => {
  const report = (
    persona: 'ANALYST' | 'BROADCAST',
    locale: 'en-GB' | 'es-ES',
  ) => buildReport({ recap: data, fixture: fixture(), persona, locale });

  it('puts the story before the key moments, each paragraph labelled', () => {
    const text = report('BROADCAST', 'es-ES');
    const story = text.indexOf(RECAP_COPY.report.story);
    expect(story).toBeGreaterThan(-1);
    expect(story).toBeLessThan(text.indexOf(RECAP_COPY.report.moments));
    expect(text).toContain(RECAP_COPY.localeFallback('Spanish'));
    expect(text).toContain('First half: Away City led at the break.');
    expect(text).toContain('Full time: Home United came back to win 3–2.');
  });

  it('lists the three breakdown parts under an analyst moment', () => {
    const text = report('ANALYST', 'en-GB');
    expect(text).toContain(`    What happened: ${parts.whatHappened.text}`);
    expect(text).toContain(`    Why it matters: ${parts.whyItMatters.text}`);
    expect(text).toContain(`    What to watch: ${parts.whatToWatch.text}`);
    expect(text).toContain('Set-piece pressure pays off.');
    expect(text).not.toContain('The plain analyst write-up.');
  });

  it('leaves the story out of older reports', () => {
    const text = buildReport({
      recap: recap(),
      fixture: fixture(),
      persona: 'BROADCAST',
      locale: 'en-GB',
    });
    expect(text).not.toContain(RECAP_COPY.report.story);
    expect(text).toContain('Home United level it. A header from the corner.');
  });
});

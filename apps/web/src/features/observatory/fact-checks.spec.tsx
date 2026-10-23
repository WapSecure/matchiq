import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { buildReport } from '@/features/recap/recap-report';
import { createQueryClient } from '@/lib/api/query-provider';
import { fixture } from '@/test/factories';
import { stubApi } from '@/test/stub-api';
import { recap, run, trace } from '@/test/session-factories';
import { FallbackNote } from './fallback-note';
import { MomentList } from './moment-list';
import { TraceSummary } from './trace-summary';

const traces = [
  trace(),
  trace({
    insightId: 'in_ai',
    publication: 'AGENT',
    fallbackReason: null,
    matchClockMs: 1_200_000,
  }),
  trace({
    insightId: 'in_slow',
    fallbackReason: 'agents service timed out after 4000 ms',
    matchClockMs: 1_800_000,
  }),
  trace({
    insightId: 'in_down',
    fallbackReason: 'agents service unreachable',
    matchClockMs: 2_400_000,
    runs: [run({ faultInjected: 'MODEL_TIMEOUT', faultNote: 'x' })],
  }),
];

// Trace cards load their agent hand-offs; unknown routes answer 404, an empty timeline.
const renderList = (ui: React.ReactNode) => {
  stubApi({});
  return render(
    <QueryClientProvider client={createQueryClient()}>
      {ui}
    </QueryClientProvider>,
  );
};

describe('AI fact-checks overview', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('says a repeated reason once, with a count', () => {
    render(<FallbackNote traces={traces} />);
    const items = within(screen.getByTestId('fallback-note')).getAllByRole(
      'listitem',
    );
    expect(items.map((li) => li.textContent)).toEqual([
      '2 moments used standard wording because the AI was slow or unavailable.',
      '1 moment used standard wording because AI writing is switched off here.',
    ]);
  });

  it('titles every summary tile in sentence case', () => {
    render(<TraceSummary traces={traces} />);
    const titles = screen.getAllByRole('term').map((t) => t.textContent ?? '');
    expect(titles).toHaveLength(4);
    for (const title of titles) expect(title).not.toBe(title.toUpperCase());
    expect(titles).toContain('Written by AI');
  });

  it('shows the share written by AI as a number and a bar', () => {
    render(<TraceSummary traces={traces} />);
    expect(screen.getByText('25%')).toBeInTheDocument();
    expect(screen.getByText('1 of 4 key moments')).toBeInTheDocument();
    expect(
      screen.getByRole('img', {
        name: '1 written by AI, 3 in standard wording, 0 still being written',
      }),
    ).toBeInTheDocument();
  });

  it('filters moments and keeps a minute marker per shown moment', async () => {
    const user = userEvent.setup();
    renderList(<MomentList traces={traces} moments={new Map()} />);
    const list = () =>
      screen.getByRole('list', { name: 'Key moments and their checks' });
    expect(within(list()).getAllByRole('article')).toHaveLength(4);
    await user.click(screen.getByRole('radio', { name: 'Written by AI (1)' }));
    expect(within(list()).getAllByRole('article')).toHaveLength(1);
    const strip = screen.getByRole('list', { name: 'Key moments by minute' });
    expect(within(strip).getAllByRole('link')).toHaveLength(1);
    await user.click(
      screen.getByRole('radio', { name: 'Simulated failures (1)' }),
    );
    expect(within(list()).getByRole('article')).toHaveAttribute(
      'id',
      'moment-in_down',
    );
  });
});

describe('moment paging', { timeout: 20_000 }, () => {
  const many = Array.from({ length: 25 }, (_, n) =>
    trace({
      insightId: `in_${n}`,
      publication: n % 2 ? 'AGENT' : 'TEMPLATE',
      fallbackReason: n % 2 ? null : 'agents service unreachable',
      matchClockMs: n * 60_000,
    }),
  );
  const articles = () =>
    within(
      screen.getByRole('list', { name: 'Key moments and their checks' }),
    ).getAllByRole('article');

  it('shows ten at a time and loads the rest on request', async () => {
    const user = userEvent.setup();
    renderList(<MomentList traces={many} moments={new Map()} />);
    expect(articles()).toHaveLength(10);
    await user.click(screen.getByRole('button', { name: 'Show more' }));
    expect(articles()).toHaveLength(20);
    await user.click(screen.getByRole('button', { name: 'Show more' }));
    expect(articles()).toHaveLength(25);
    expect(screen.queryByRole('button', { name: 'Show more' })).toBeNull();
  });

  it('starts again from ten when the filter changes', async () => {
    const user = userEvent.setup();
    renderList(<MomentList traces={many} moments={new Map()} />);
    await user.click(screen.getByRole('button', { name: 'Show more' }));
    await user.click(screen.getByRole('radio', { name: /Standard wording/ }));
    expect(articles()).toHaveLength(10);
    expect(screen.getByText(/of 13 key moments/)).toBeInTheDocument();
  });

  it('loads a moment that is not shown yet when its marker is clicked', async () => {
    const user = userEvent.setup();
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    renderList(<MomentList traces={many} moments={new Map()} />);
    expect(document.getElementById('moment-in_22')).toBeNull();
    const strip = screen.getByRole('list', { name: 'Key moments by minute' });
    await user.click(within(strip).getAllByRole('link')[22] as HTMLElement);
    expect(document.getElementById('moment-in_22')).not.toBeNull();
    expect(articles()).toHaveLength(25);
    expect(scroll).toHaveBeenCalled();
  });
});

describe('match report', () => {
  it('reads as plain text with the score, moments and stats', () => {
    const text = buildReport({
      recap: recap(),
      fixture: fixture(),
      persona: 'BROADCAST',
      locale: 'en-GB',
    });
    expect(text).toContain('Final score: Home United 3–2 Away City');
    expect(text).toContain("76'");
    expect(text).toContain('Shots: ');
    expect(text).not.toContain('{');
  });
});

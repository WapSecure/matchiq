import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createQueryClient } from '@/lib/api/query-provider';
import { createFakeTransport, frameOf } from '@/test/fake-transport';
import {
  cue,
  FX,
  fixture,
  insight,
  message,
  narrative,
  shot,
  snapshot,
} from '@/test/factories';
import { LiveStudio } from './live-studio';
import { createMatchStore, STUDIO_UI_DEFAULTS, useStudioUi } from './store';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

const stubApi = () =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const body = url.includes('/state')
        ? snapshot({ throughSequence: 2 })
        : url.includes('/events')
          ? [shot(1), shot(2)]
          : fixture();
      return new Response(JSON.stringify(body), { status: 200 });
    }),
  );

const renderStudio = async () => {
  const fake = createFakeTransport();
  const store = createMatchStore(FX);
  render(
    <QueryClientProvider client={createQueryClient()}>
      <LiveStudio fixtureId={FX} store={store} transport={fake.transport} />
    </QueryClientProvider>,
  );
  await screen.findByRole('heading', { level: 1 });
  const push = async (...messages: Parameters<typeof frameOf>[0][]) => {
    messages.forEach((m) => fake.connections[0]?.push(frameOf(m)));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 150));
    });
  };
  return { store, push };
};

const metricsText = () =>
  screen.getByRole('region', { name: 'Live metrics' }).textContent;
const scoreText = () =>
  screen.getByRole('region', { name: 'Scoreboard' }).textContent;

describe('LiveStudio', () => {
  beforeEach(() => {
    useStudioUi.setState({ ...STUDIO_UI_DEFAULTS });
    stubApi();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('seeds from REST and applies streamed insights, narratives and cues', async () => {
    const { push } = await renderStudio();
    await waitFor(() => expect(scoreText()).toContain('1'));
    await push(
      message(
        'replay.status',
        {
          fixtureId: FX,
          state: 'PLAYING',
          speed: 20,
          appliedSequence: 2,
          period: 1,
          matchClockMs: 600_000,
        },
        1,
      ),
      message('insight.detected', insight(), 2),
      message('narrative.ready', narrative(), 3),
      message('overlay.publish', cue(), 4),
    );
    expect(
      screen.getByRole('article', { name: 'Home pile on the pressure' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('group', { name: /1 cue on air/ }),
    ).toHaveTextContent('Shot burst');
    expect(screen.getAllByRole('status').map((el) => el.textContent)).toContain(
      'Stream Live',
    );
  });

  it('switches persona and locale without changing any number', async () => {
    const user = userEvent.setup();
    const { push } = await renderStudio();
    await push(
      message('insight.detected', insight(), 1),
      message('narrative.ready', narrative(), 2),
      message(
        'narrative.ready',
        narrative({
          narrativeId: 'nr_fr',
          locale: 'fr-FR',
          headline: 'Les locaux poussent',
        }),
        3,
      ),
      message(
        'narrative.ready',
        narrative({
          narrativeId: 'nr_an',
          persona: 'ANALYST',
          headline: 'Shot rate tripled',
        }),
        4,
      ),
    );
    await waitFor(() => expect(metricsText()).toContain('Shots'));
    const before = { metrics: metricsText(), score: scoreText() };

    await user.click(screen.getByRole('radio', { name: /Français/ }));
    expect(screen.getByText('Les locaux poussent')).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'Analyst' }));
    expect(screen.getByText(/fr-FR variant unavailable/)).toBeInTheDocument();
    expect(screen.getByText('shots.home.rolling5m')).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'Casual' }));
    expect(screen.getByText(/Narrative pending/)).toBeInTheDocument();

    expect(metricsText()).toBe(before.metrics);
    expect(scoreText()).toBe(before.score);
  });

  it('opens the evidence drawer with triggering events and closes it', async () => {
    const user = userEvent.setup();
    const { push } = await renderStudio();
    await push(
      message('match.event', shot(3), 1),
      message('match.event', shot(4), 2),
      message('insight.detected', insight(), 3),
    );
    await user.click(screen.getByRole('button', { name: /open evidence/i }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Triggering events')).toBeInTheDocument();
    expect(within(dialog).getAllByText('Shot')).toHaveLength(2);
    expect(
      within(dialog).getByText('shots.home.rolling5m'),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText('No counter-evidence recorded for this window.'),
    ).toBeInTheDocument();
    await user.click(
      within(dialog).getByRole('button', { name: 'Close evidence' }),
    );
    await waitFor(() =>
      expect(useStudioUi.getState().selectedInsightId).toBeNull(),
    );
  });

  it('removes a retracted cue from the preview and logs the reason', async () => {
    const { push } = await renderStudio();
    await push(
      message(
        'replay.status',
        {
          fixtureId: FX,
          state: 'PLAYING',
          speed: 20,
          appliedSequence: 2,
          period: 1,
          matchClockMs: 600_000,
        },
        1,
      ),
      message('overlay.publish', cue(), 2),
    );
    expect(
      screen.getByRole('group', { name: /1 cue on air/ }),
    ).toBeInTheDocument();
    await push(
      message(
        'overlay.retract',
        { overlayId: 'ov_1', revision: 1, reason: 'Goal disallowed' },
        3,
      ),
    );
    expect(
      screen.getByRole('group', { name: /no cue on air/ }),
    ).toBeInTheDocument();
    expect(screen.getByText('Goal disallowed')).toBeInTheDocument();
  });
});

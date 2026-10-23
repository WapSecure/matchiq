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
import { status, template } from '@/test/session-factories';
import { callsTo, type Routes, stubApi } from '@/test/stub-api';
import { LiveStudio } from './live-studio';
import { createMatchStore, STUDIO_UI_DEFAULTS, useStudioUi } from './store';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

const items = (list: unknown[]) => ({ body: { items: list } });

const baseRoutes = (overrides: Routes = {}): Routes => ({
  'GET /fixtures/fx_test': { body: fixture() },
  'GET /state': { body: snapshot({ throughSequence: 2 }) },
  'GET /events': {
    body: { items: [shot(1), shot(2)], nextAfterSequence: null },
  },
  'GET /replay': { body: status({ appliedSequence: 2 }) },
  'GET /insights': items([]),
  'GET /narratives': items([]),
  'GET /overlays': items([]),
  'GET /fixture-templates': items([template()]),
  ...overrides,
});

const renderStudio = async (routes: Routes = baseRoutes()) => {
  const api = stubApi(routes);
  const fake = createFakeTransport({ autoOpen: true });
  const store = createMatchStore(FX);
  render(
    <QueryClientProvider client={createQueryClient()}>
      <LiveStudio fixtureId={FX} store={store} transport={fake.transport} />
    </QueryClientProvider>,
  );
  await screen.findByRole('heading', { level: 1 });
  await waitFor(() => expect(store.getState().hydrated).toBe(true));
  const push = async (...messages: Parameters<typeof frameOf>[0][]) => {
    messages.forEach((m) => fake.connections[0]?.push(frameOf(m)));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 150));
    });
  };
  return { api, store, push, fake };
};

const metricsText = () =>
  screen.getByRole('region', { name: 'Match stats' }).textContent;
const scoreText = () =>
  screen.getByRole('region', { name: 'Scoreboard' }).textContent;

describe('LiveStudio', () => {
  beforeEach(() => useStudioUi.setState({ ...STUDIO_UI_DEFAULTS }));
  afterEach(() => vi.unstubAllGlobals());

  it('goes live on accept and seeds from REST before any frame', async () => {
    await renderStudio();
    await waitFor(() => expect(scoreText()).toContain('1'));
    expect(screen.getAllByRole('status').map((el) => el.textContent)).toContain(
      'Connection: Live',
    );
    expect(metricsText()).toContain('Shots');
  });

  it('hydrates insights, narratives and cues when joining mid-match', async () => {
    const { push } = await renderStudio(
      baseRoutes({
        'GET /insights': items([insight()]),
        'GET /narratives': items([narrative()]),
        'GET /overlays': items([cue()]),
        'GET /replay': { body: status({ appliedSequence: 2 }) },
      }),
    );
    expect(
      await screen.findByRole('article', { name: 'Home pile on the pressure' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('group', { name: /1 graphic on air/ }),
    ).toHaveTextContent('Shot burst');
    await push(
      message('insight.detected', insight(), 1),
      message('narrative.ready', narrative(), 2),
    );
    expect(
      screen.getAllByRole('article', { name: 'Home pile on the pressure' }),
    ).toHaveLength(1);
  });

  it('dates each insight by its own period, not the current one (MQ-024)', async () => {
    const goal = (id: string, period: 1 | 2, minute: number) =>
      insight({
        insightId: id,
        kind: 'GOAL',
        priority: 'P0',
        period,
        matchClockMs: minute * 60_000,
      });
    await renderStudio(
      baseRoutes({
        'GET /insights': items([goal('in_h1', 1, 22), goal('in_h2', 2, 19)]),
        'GET /replay': {
          body: status({ appliedSequence: 2, period: 2, matchClockMs: 3e6 }),
        },
      }),
    );
    await screen.findAllByRole('article', { name: 'Goal' });
    const minutes = screen
      .getAllByRole('article', { name: 'Goal' })
      .map((card) => within(card).getByText(/'$/).textContent);
    expect(minutes).toEqual(["65'", "23'"]);
  });

  it('applies streamed insights, narratives and cues', async () => {
    const { push } = await renderStudio();
    await push(
      message('replay.status', status({ appliedSequence: 2 }), 1),
      message('insight.detected', insight(), 2),
      message('narrative.ready', narrative(), 3),
      message('overlay.publish', cue(), 4),
    );
    expect(
      screen.getByRole('article', { name: 'Home pile on the pressure' }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('on-air-meta')).toHaveTextContent(
      /Key moment.*Standard wording/,
    );
  });

  it('switches persona and locale, refetching narratives, never numbers', async () => {
    const user = userEvent.setup();
    const routes = baseRoutes({
      'GET /insights': items([insight()]),
      'GET /narratives': (url) =>
        items(
          url.searchParams.get('locale') === 'fr-FR'
            ? [
                narrative({
                  narrativeId: 'nr_fr',
                  locale: 'fr-FR',
                  headline: 'Les locaux poussent',
                }),
              ]
            : [narrative()],
        ),
    });
    const { api } = await renderStudio(routes);
    await screen.findByText('Home pile on the pressure');
    const before = { metrics: metricsText(), score: scoreText() };

    await user.click(screen.getByRole('radio', { name: /Français/ }));
    expect(await screen.findByText('Les locaux poussent')).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'Fan' }));
    await waitFor(() =>
      expect(
        callsTo(api, '/narratives').some(([u]) =>
          String(u).includes('persona=CASUAL&locale=fr-FR'),
        ),
      ).toBe(true),
    );
    expect(await screen.findByText(/Write-up on its way/)).toBeInTheDocument();
    expect(metricsText()).toBe(before.metrics);
    expect(scoreText()).toBe(before.score);
  });

  it('offers Nigerian Pidgin as a fourth language', async () => {
    const user = userEvent.setup();
    await renderStudio(
      baseRoutes({
        'GET /insights': items([insight()]),
        'GET /narratives': (url) =>
          items(
            url.searchParams.get('locale') === 'pcm-NG'
              ? [
                  narrative({
                    narrativeId: 'nr_pcm',
                    locale: 'pcm-NG',
                    headline: 'Home team dey press well well',
                  }),
                ]
              : [narrative()],
          ),
      }),
    );
    const languages = screen.getByRole('radiogroup', { name: 'Language' });
    expect(within(languages).getAllByRole('radio')).toHaveLength(4);
    await user.click(
      within(languages).getByRole('radio', { name: 'Naijá (Pidgin) (PCM)' }),
    );
    expect(
      (await screen.findByText('Home team dey press well well')).closest(
        '[lang]',
      ),
    ).toHaveAttribute('lang', 'pcm-NG');
  });

  it('drives the transport from server status, not local guesses', async () => {
    const user = userEvent.setup();
    const routes = baseRoutes({
      'POST /replay': { status: 202, body: status({ state: 'PAUSED' }) },
    });
    const { push } = await renderStudio(routes);
    const pause = await screen.findByRole('button', { name: 'Pause' });
    await user.click(pause);
    expect(
      await screen.findByText(/Waiting for the replay to respond/),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    await push(message('replay.status', status({ state: 'PAUSED' }), 1));
    expect(screen.getByRole('button', { name: 'Resume' })).toBeInTheDocument();
    expect(screen.getByText('Paused · 20×')).toBeInTheDocument();
  });

  it('surfaces a 409 conflict inline', async () => {
    const user = userEvent.setup();
    const conflict = {
      type: 'urn:matchiq:problem:replay-state-conflict',
      title: 'Replay command not allowed in the current state',
      status: 409,
      detail: 'cannot pause while PAUSED',
    };
    await renderStudio(
      baseRoutes({ 'POST /replay': { status: 409, body: conflict } }),
    );
    await user.click(await screen.findByRole('button', { name: 'Pause' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      "That can't be done right now. The replay may have finished, or it is already doing that.",
    );
    expect(alert).not.toHaveTextContent(/PAUSED|409/);
  });

  it('resolves evidence events outside the timeline from the ledger', async () => {
    const user = userEvent.setup();
    const routes = baseRoutes({
      'GET /insights': items([insight()]),
      'GET /events': (url) =>
        url.searchParams.get('limit') === '500'
          ? { body: { items: [shot(3), shot(4)], nextAfterSequence: null } }
          : { body: { items: [shot(1), shot(2)], nextAfterSequence: null } },
    });
    await renderStudio(routes);
    await user.click(
      await screen.findByRole('button', { name: /see the evidence/i }),
    );
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('The plays behind it')).toBeInTheDocument();
    await waitFor(() =>
      expect(within(dialog).getAllByText('Shot')).toHaveLength(2),
    );
    expect(
      within(dialog).getByText('Shots (home, last 5 min)'),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText('Every attempt at goal'),
    ).toBeInTheDocument();
    expect(
      within(within(dialog).getByTestId('technical-details')).getByText(
        /count\(SHOT\)/,
      ),
    ).toBeInTheDocument();
    await user.click(
      within(dialog).getByRole('button', { name: 'Close evidence' }),
    );
    await waitFor(() =>
      expect(useStudioUi.getState().selectedInsightId).toBeNull(),
    );
  });

  it('degrades gracefully before the first snapshot is projected', async () => {
    const { push } = await renderStudio(
      baseRoutes({
        'GET /state': {
          status: 404,
          body: { type: 'urn:x', title: 'No state', status: 404 },
        },
      }),
    );
    expect(
      await screen.findByText(/appear once play begins/),
    ).toBeInTheDocument();
    await push(message('match.snapshot', snapshot(), 1));
    expect(metricsText()).toContain('Shots');
  });

  it('takes a retracted cue off air at once and logs the reason', async () => {
    const { push } = await renderStudio();
    await push(
      message('replay.status', status({ appliedSequence: 2 }), 1),
      message('overlay.publish', cue(), 2),
    );
    expect(
      screen.getByRole('group', { name: /1 graphic on air/ }),
    ).toBeInTheDocument();
    await push(
      message(
        'overlay.retract',
        { overlayId: 'ov_1', revision: 1, reason: 'Goal disallowed' },
        3,
      ),
    );
    expect(
      screen.getByRole('group', { name: /standing by/ }),
    ).toBeInTheDocument();
    expect(screen.getByText('Goal disallowed')).toBeInTheDocument();
  });

  it('shows headline events first and every play on request', async () => {
    const user = userEvent.setup();
    const {
      outcome: _o,
      bodyPart: _b,
      ...base
    } = shot(3) as Extract<ReturnType<typeof shot>, { type: 'SHOT' }>;
    const tackle = {
      ...base,
      type: 'TACKLE',
      opponentPlayerId: 'pl_aw01',
      won: true,
    } as ReturnType<typeof shot>;
    await renderStudio(
      baseRoutes({
        'GET /events': {
          body: { items: [shot(1), shot(2), tackle], nextAfterSequence: null },
        },
        'GET /replay': { body: status({ appliedSequence: 3 }) },
      }),
    );
    const timeline = await screen.findByRole('list', { name: 'Match events' });
    await waitFor(() =>
      expect(within(timeline).getAllByText('Shot')).toHaveLength(2),
    );
    expect(within(timeline).queryByText('Tackle')).not.toBeInTheDocument();
    await user.click(screen.getByRole('switch', { name: 'Show all events' }));
    expect(
      within(screen.getByRole('list', { name: 'Match events' })).getByText(
        'Tackle',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('navigation', { name: 'More match events' }),
    ).toHaveTextContent('Showing 3 events');
  });

  it('offers the recap at full time', async () => {
    const { push } = await renderStudio();
    expect(screen.queryByRole('link', { name: /See the recap/ })).toBeNull();
    await push(message('replay.status', status({ state: 'COMPLETED' }), 1));
    expect(screen.getByRole('link', { name: /See the recap/ })).toHaveAttribute(
      'href',
      `/studio/${FX}/recap`,
    );
  });
});

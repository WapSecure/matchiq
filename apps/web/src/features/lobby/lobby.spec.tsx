import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createQueryClient } from '@/lib/api/query-provider';
import { fixture } from '@/test/factories';
import {
  SESSION,
  sessionView,
  status,
  template,
} from '@/test/session-factories';
import { callsTo, stubApi } from '@/test/stub-api';
import { RecentSessions } from './recent-sessions';
import { TemplateLobby } from './template-lobby';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const renderLobby = () =>
  render(
    <QueryClientProvider client={createQueryClient()}>
      <TemplateLobby />
      <RecentSessions />
    </QueryClientProvider>,
  );

const templates = [
  template({
    templateId: 'fx_high-press_42',
    scenario: 'high-press',
    title: 'Press FC vs Block United',
  }),
  template({ templateId: 'fx_comeback_42' }),
];

describe('lobby', () => {
  beforeEach(() => push.mockReset());
  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.replaceState(null, '', '/');
  });

  it('lists templates with the quick-start scenario first', async () => {
    stubApi({
      'GET /fixture-templates': { body: { items: templates } },
      'GET /replay-sessions': { body: { items: [sessionView()] } },
    });
    renderLobby();
    const list = await screen.findByRole('list', {
      name: 'Matches',
    });
    const cards = within(list).getAllByRole('article');
    expect(cards[0]).toHaveTextContent('Late comeback');
    expect(cards[0]).toHaveTextContent('Recommended replay');
    expect(cards[0]).toHaveTextContent(
      'What to expect: The visitors build a lead before the break.',
    );
    expect(cards[1]).toHaveTextContent('High press');
    const sessions = await screen.findByRole('group', {
      name: 'Recent replays',
    });
    expect(sessions).toHaveTextContent('Live');
    expect(sessions).toHaveTextContent("11' · 20×");
  });

  it('keeps one simulated-data disclosure, outside the cards', async () => {
    stubApi({
      'GET /fixture-templates': {
        body: {
          items: [
            template({
              competitionLabel: 'MatchIQ Synthetic League (simulated data)',
            }),
          ],
        },
      },
      'GET /replay-sessions': { body: { items: [] } },
    });
    renderLobby();
    const card = await screen.findByRole('article');
    expect(card).toHaveTextContent('MatchIQ Synthetic League');
    expect(card).not.toHaveTextContent(/simulated/i);
    expect(
      within(card).getByRole('heading', { name: 'Home United vs Away City' }),
    ).toBeInTheDocument();
  });

  it('lists live replays above finished ones, with how long ago each moved', async () => {
    vi.useFakeTimers({
      toFake: ['Date'],
      now: Date.parse('2026-10-21T17:33:51Z'),
    });
    stubApi({
      'GET /fixture-templates': { body: { items: [template()] } },
      'GET /replay-sessions': {
        body: {
          items: [
            sessionView({
              sessionId: 'fx_test_s2',
              sessionNumber: 2,
              status: status({
                state: 'COMPLETED',
                period: 2,
                matchClockMs: 2_700_000,
              }),
            }),
            sessionView({ status: status({ state: 'PAUSED' }) }),
          ],
        },
      },
    });
    renderLobby();
    const [live, finished] = await screen.findAllByRole('list', {
      name: /Live now|Finished/,
    });
    expect(live).toHaveAccessibleName('Live now');
    expect(live).toHaveTextContent('Replay 1');
    expect(live).toHaveTextContent('Paused');
    expect(live).toHaveTextContent('12 min ago');
    expect(finished).toHaveAccessibleName('Finished');
    expect(finished).toHaveTextContent('Replay 2');
    expect(finished).toHaveTextContent('Full time');
    vi.useRealTimers();
  });

  it('starts a session at the chosen speed and opens its studio', async () => {
    const user = userEvent.setup();
    const api = stubApi({
      'GET /fixture-templates': { body: { items: [template()] } },
      'GET /replay-sessions': { body: { items: [] } },
      'POST /sessions': {
        status: 201,
        body: {
          fixture: fixture({ fixtureId: SESSION }),
          session: sessionView(),
        },
      },
    });
    renderLobby();
    const card = await screen.findByRole('article');
    await user.click(
      within(card).getByRole('button', { name: /Replay speed/ }),
    );
    await user.click(screen.getByRole('option', { name: /30×/ }));
    await user.click(
      within(card).getByRole('button', { name: /Start replay/ }),
    );
    await vi.waitFor(() =>
      expect(push).toHaveBeenCalledWith(`/studio/${SESSION}`),
    );
    const [, init] = callsTo(api, '/fx_test/sessions')[0] ?? [];
    expect(init?.body).toBe('{"speed":30}');
  });

  it('explains a rate-limited start', async () => {
    const user = userEvent.setup();
    stubApi({
      'GET /fixture-templates': { body: { items: [template()] } },
      'POST /sessions': {
        status: 429,
        body: { type: 'urn:x', title: 'Too Many Requests', status: 429 },
      },
    });
    renderLobby();
    await user.click(
      await screen.findByRole('button', { name: /Start replay/ }),
    );
    const problem = await screen.findByTestId('inline-problem');
    expect(problem).toHaveAttribute('role', 'alert');
    expect(problem).toHaveTextContent(/started a lot of replays/);
    expect(push).not.toHaveBeenCalled();
  });

  it('shows a copyable match code and keeps the hash in technical details', async () => {
    const user = userEvent.setup();
    stubApi({
      'GET /fixture-templates': { body: { items: [template()] } },
      'GET /replay-sessions': { body: { items: [sessionView()] } },
    });
    renderLobby();
    const card = await screen.findByRole('article');
    const copy = within(card).getByRole('button', {
      name: 'Copy match code: HMU-AWC · NANA',
    });
    const hash = within(card).getByText('a'.repeat(64));
    expect(hash).not.toBeVisible();
    await user.click(copy);
    expect(await within(card).findByText('Copied')).toBeInTheDocument();
    expect(await navigator.clipboard.readText()).toBe('HMU-AWC · NANA');
    await user.click(
      within(card).getByRole('button', { name: /Technical details/ }),
    );
    expect(hash).toBeVisible();
    expect(await screen.findByText(/Replay 1 · HMU-AWC · NANA/)).toBeVisible();
  });

  it('pages the matches with numbered pages synced to the URL', async () => {
    const many = Array.from({ length: 8 }, (_, i) =>
      template({
        templateId: `fx_m${i + 1}_42`,
        scenario: 'high-press',
        title: `Match ${i + 1}`,
      }),
    );
    stubApi({
      'GET /fixture-templates': { body: { items: many, nextCursor: null } },
      'GET /replay-sessions': { body: { items: [], nextCursor: null } },
    });
    renderLobby();
    const list = await screen.findByRole('list', { name: 'Matches' });
    expect(within(list).getAllByRole('article')).toHaveLength(6);
    expect(screen.getByText('Showing 1–6 of 8 matches')).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Match pages' });
    await userEvent.click(within(nav).getByRole('button', { name: 'Page 2' }));
    expect(window.location.search).toBe('?page=2');
    expect(within(list).getAllByRole('article')).toHaveLength(2);
    expect(within(nav).getByRole('button', { name: 'Page 2' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByText('Showing 7–8 of 8 matches')).toBeInTheDocument();
  });

  it('pages recent replays forward and back with the cursor', async () => {
    const api = stubApi({
      'GET /fixture-templates': { body: { items: [template()] } },
      'GET /replay-sessions': (url) =>
        url.searchParams.get('cursor') === 'next-1'
          ? {
              body: {
                items: [
                  sessionView({ sessionId: 'fx_test_s1', sessionNumber: 1 }),
                ],
                nextCursor: null,
                total: 9,
              },
            }
          : {
              body: {
                items: Array.from({ length: 8 }, (_, i) =>
                  sessionView({
                    sessionId: `fx_test_s${9 - i}`,
                    sessionNumber: 9 - i,
                  }),
                ),
                nextCursor: 'next-1',
                total: 9,
              },
            },
    });
    renderLobby();
    expect(
      await screen.findByText('Showing 1–8 of 9 replays'),
    ).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Recent replay pages' });
    await userEvent.click(
      within(nav).getByRole('button', { name: 'Next page' }),
    );
    expect(
      await screen.findByText('Showing 9–9 of 9 replays'),
    ).toBeInTheDocument();
    expect(window.location.search).toBe('?after=next-1');
    const paged = new URL(String(callsTo(api, '/replay-sessions').at(-1)?.[0]));
    expect(paged.searchParams.get('cursor')).toBe('next-1');
    expect(paged.searchParams.get('limit')).toBe('8');
    await userEvent.click(
      within(nav).getByRole('button', { name: 'Previous page' }),
    );
    expect(
      await screen.findByText('Showing 1–8 of 9 replays'),
    ).toBeInTheDocument();
    expect(window.location.search).toBe('');
  });

  it('falls back to the newest replays when a shared page has gone', async () => {
    window.history.replaceState(null, '', '/?after=stale');
    stubApi({
      'GET /fixture-templates': { body: { items: [template()] } },
      'GET /replay-sessions': (url) =>
        url.searchParams.get('cursor') === 'stale'
          ? {
              status: 400,
              body: {
                type: 'urn:matchiq:problem:invalid-cursor',
                title: 'Invalid pagination cursor',
                status: 400,
              },
            }
          : { body: { items: [sessionView()], nextCursor: null, total: 1 } },
    });
    renderLobby();
    expect(
      await screen.findByText('Showing 1–1 of 1 replay'),
    ).toBeInTheDocument();
    expect(window.location.search).toBe('');
  });

  it('shows empty states', async () => {
    stubApi({
      'GET /fixture-templates': { body: { items: [] } },
      'GET /replay-sessions': { body: { items: [] } },
    });
    renderLobby();
    expect(
      await screen.findByText('No matches to replay yet'),
    ).toBeInTheDocument();
    expect(
      await screen.findByText('No replays yet. Start one above.'),
    ).toBeInTheDocument();
  });
});

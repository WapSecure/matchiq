import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createQueryClient } from '@/lib/api/query-provider';
import { fixture } from '@/test/factories';
import { SESSION, sessionView, template } from '@/test/session-factories';
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
  afterEach(() => vi.unstubAllGlobals());

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
    expect(cards[0]).toHaveTextContent('Judge quick-start');
    expect(cards[0]).toHaveTextContent('1,470');
    expect(cards[1]).toHaveTextContent('High press');
    const sessions = await screen.findByRole('list', {
      name: 'Recent replays',
    });
    expect(sessions).toHaveTextContent('Playing');
    expect(sessions).toHaveTextContent("11' · 20×");
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
    await user.selectOptions(within(card).getByLabelText(/Replay speed/), '30');
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

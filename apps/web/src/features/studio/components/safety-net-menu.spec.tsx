import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type * as Env from '@/lib/env';
import type * as SessionStore from '@/lib/auth/session-store';
import { createQueryClient } from '@/lib/api/query-provider';
import { fixture } from '@/test/factories';
import { SESSION, sessionView, template } from '@/test/session-factories';
import { callsTo, type Routes, stubApi } from '@/test/stub-api';
import { SafetyNetMenu } from './safety-net-menu';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const flags = vi.hoisted(() => ({ demo: true, allowed: true }));
vi.mock('@/lib/auth/session-store', async (importOriginal) => ({
  ...(await importOriginal<typeof SessionStore>()),
  useCan: () => flags.allowed,
}));
vi.mock('@/lib/env', async (importOriginal) => {
  const actual = await importOriginal<typeof Env>();
  return {
    ...actual,
    PUBLIC_ENV: {
      ...actual.PUBLIC_ENV,
      get NEXT_PUBLIC_DEMO_MODE() {
        return flags.demo;
      },
    },
  };
});

const routes = (overrides: Routes = {}): Routes => ({
  'GET /fixture-templates': { body: { items: [template()] } },
  'POST /sessions': {
    status: 201,
    body: { fixture: fixture({ fixtureId: SESSION }), session: sessionView() },
  },
  ...overrides,
});

const renderMenu = (api: Routes = routes()) => {
  const mock = stubApi(api);
  render(
    <QueryClientProvider client={createQueryClient()}>
      <SafetyNetMenu sessionId={SESSION} />
    </QueryClientProvider>,
  );
  return mock;
};

describe('SafetyNetMenu', () => {
  beforeEach(() => {
    push.mockReset();
    Object.assign(flags, { demo: true, allowed: true });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('lists the three scenarios in plain words', async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(
      await screen.findByRole('button', { name: 'Show the safety net' }),
    );
    const items = await screen.findAllByRole('menuitem');
    expect(items.map((i) => i.textContent)).toEqual([
      'Wrong number fixed, The fact checker catches a wrong number, then the writer fixes it',
      'Timed out, The writer times out, so standard wording goes out on time',
      'Wrong number blocked, The final fact check blocks a wrong number before air',
    ]);
  });

  it('starts a new Brisk replay of the same match with the chosen failure', async () => {
    const user = userEvent.setup();
    const api = renderMenu();
    await user.click(
      await screen.findByRole('button', { name: 'Show the safety net' }),
    );
    await user.click(
      await screen.findByRole('menuitem', { name: /Timed out/ }),
    );
    await vi.waitFor(() =>
      expect(push).toHaveBeenCalledWith(`/studio/${SESSION}`),
    );
    const [, init] = callsTo(api, '/fx_test/sessions')[0] ?? [];
    expect(JSON.parse(String(init?.body))).toEqual({
      speed: 5,
      faultPlan: { scenario: 'MODEL_TIMEOUT', everyNth: 3 },
    });
  });

  it('is hidden when demo mode is off', async () => {
    flags.demo = false;
    const api = renderMenu();
    await vi.waitFor(() =>
      expect(callsTo(api, '/fixture-templates')).toHaveLength(1),
    );
    expect(screen.queryByRole('button', { name: /safety net/ })).toBeNull();
  });

  it('is hidden without permission to start replays', async () => {
    flags.allowed = false;
    const api = renderMenu();
    await vi.waitFor(() =>
      expect(callsTo(api, '/fixture-templates')).toHaveLength(1),
    );
    expect(screen.queryByRole('button', { name: /safety net/ })).toBeNull();
  });

  it('explains a failed start in plain words', async () => {
    const user = userEvent.setup();
    renderMenu(
      routes({
        'POST /sessions': {
          status: 429,
          body: { type: 'urn:x', title: 'Too Many Requests', status: 429 },
        },
      }),
    );
    await user.click(
      await screen.findByRole('button', { name: 'Show the safety net' }),
    );
    await user.click(await screen.findByRole('menuitem', { name: /blocked/ }));
    const problem = await screen.findByTestId('inline-problem');
    expect(problem).toHaveTextContent(
      /couldn't start a new replay|too many|again/i,
    );
    expect(push).not.toHaveBeenCalled();
  });
});

import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { createQueryClient } from '@/lib/api/query-provider';
import { FX } from '@/test/factories';
import { callsTo, type Routes, stubApi } from '@/test/stub-api';
import type * as SessionStore from '@/lib/auth/session-store';
import { createMatchStore, MatchStoreProvider } from '../store';
import { EditorialNotice } from './editorial-notice';
import { FreezeControl } from './freeze-control';
import { KillSwitchControl } from './kill-switch-control';
import { useEditorialNotice } from './notice-store';

const AT = '2026-10-24T14:05:00.000Z';
const frozen = {
  fixtureId: FX,
  mode: 'FROZEN',
  freeze: { active: true, changedAt: AT },
  killSwitch: { active: false, changedAt: null },
};
const AUDIT_ID = '0b9c8e43-8f3e-4c43-9a34-0a5f8c3a1d11';

const access = vi.hoisted(() => ({ allowed: true }));
vi.mock('@/lib/auth/session-store', async (importOriginal) => ({
  ...(await importOriginal<typeof SessionStore>()),
  useCan: () => access.allowed,
}));

const renderControl = (ui: ReactNode, routes: Routes, allowed = true) => {
  access.allowed = allowed;
  const api = stubApi(routes);
  const store = createMatchStore(FX);
  render(
    <QueryClientProvider client={createQueryClient()}>
      <MatchStoreProvider fixtureId={FX} store={store}>
        {ui}
        <EditorialNotice />
      </MatchStoreProvider>
    </QueryClientProvider>,
  );
  return { api, store, user: userEvent.setup() };
};

const notice = () =>
  screen.getByRole('status', { name: 'Editorial notifications' });

describe('editorial controls', () => {
  beforeEach(() => useEditorialNotice.setState({ notice: null }));
  afterEach(() => vi.unstubAllGlobals());

  it('asks for a reason, then freezes with an idempotency key', async () => {
    const { api, store, user } = renderControl(<FreezeControl />, {
      'POST /editorial/freeze': {
        body: { status: frozen, changed: true, auditId: AUDIT_ID },
      },
    });
    await user.click(
      screen.getByRole('button', { name: 'Freeze auto-publish' }),
    );
    const dialog = screen.getByRole('dialog', {
      name: 'Freeze auto-publish for this session',
    });
    await user.click(within(dialog).getByRole('button', { name: 'Freeze' }));
    expect(within(dialog).getByText(/at least 3 characters/)).toBeVisible();
    expect(callsTo(api, '/freeze')).toHaveLength(0);

    await user.type(
      within(dialog).getByLabelText('Reason'),
      'Goal under VAR review',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Freeze' }));
    await waitFor(() =>
      expect(store.getState().editorial?.mode).toBe('FROZEN'),
    );
    const [, init] = callsTo(api, '/freeze')[0] ?? [];
    expect(JSON.parse(String(init?.body))).toEqual({
      reason: 'Goal under VAR review',
    });
    expect(
      (init?.headers as Record<string, string>)['Idempotency-Key'],
    ).toMatch(/^[0-9a-f-]{36}$/);
    expect(notice()).toHaveTextContent('Auto-publish frozen');
    expect(
      screen.getByRole('button', { name: 'Resume auto-publish' }),
    ).toBeInTheDocument();
  });

  it('reports a changed:false result as already frozen', async () => {
    const { user } = renderControl(<FreezeControl />, {
      'POST /editorial/freeze': {
        body: { status: frozen, changed: false, auditId: null },
      },
    });
    await user.click(
      screen.getByRole('button', { name: 'Freeze auto-publish' }),
    );
    await user.type(screen.getByLabelText('Reason'), 'Second operator');
    await user.click(screen.getByRole('button', { name: 'Freeze' }));
    await waitFor(() =>
      expect(notice()).toHaveTextContent('Auto-publish was already frozen'),
    );
  });

  it('keeps the dialog open with a readable problem on 401', async () => {
    const { user } = renderControl(<FreezeControl />, {
      'POST /editorial/freeze': {
        status: 401,
        body: {
          type: 'urn:matchiq:problem:unauthorized',
          title: 'Authentication required',
          status: 401,
          requestId: 'req_9',
        },
      },
    });
    await user.click(
      screen.getByRole('button', { name: 'Freeze auto-publish' }),
    );
    await user.type(screen.getByLabelText('Reason'), 'Wrong scorer');
    await user.click(screen.getByRole('button', { name: 'Freeze' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/Sign in as a producer/);
    expect(alert).toHaveTextContent('Reference req_9');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('guards the kill switch with a reason and a typed confirmation', async () => {
    const { api, store, user } = renderControl(<KillSwitchControl />, {
      'POST /kill-switch/activate': {
        body: {
          killSwitch: { active: true, changedAt: AT },
          changed: true,
          auditId: AUDIT_ID,
          fixtureIds: [FX],
          retractedOverlayIds: ['ov_1'],
        },
      },
    });
    await user.click(screen.getByRole('button', { name: 'Kill switch' }));
    await user.type(screen.getByLabelText('Reason'), 'Feed compromised');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    const phrase = screen.getByLabelText('Confirmation');
    expect(phrase).toHaveFocus();
    await user.type(phrase, 'kill');
    await user.click(
      screen.getByRole('button', { name: 'Activate kill switch' }),
    );
    expect(screen.getByText(/Type KILL exactly/)).toBeVisible();
    expect(callsTo(api, '/activate')).toHaveLength(0);

    await user.clear(phrase);
    await user.type(phrase, 'KILL');
    await user.click(
      screen.getByRole('button', { name: 'Activate kill switch' }),
    );
    await waitFor(() =>
      expect(store.getState().editorial?.mode).toBe('KILLED'),
    );
    expect(callsTo(api, '/activate')).toHaveLength(1);
  });

  it('disables controls without permission and says why', async () => {
    const { user } = renderControl(<FreezeControl />, {}, false);
    const button = screen.getByRole('button', { name: 'Freeze auto-publish' });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveAccessibleDescription(/Producer/);
    await user.click(button);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

import type { OverlayReview } from '@matchiq/contracts';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { createQueryClient } from '@/lib/api/query-provider';
import type * as SessionStore from '@/lib/auth/session-store';
import { cue, FX, message } from '@/test/factories';
import { callsTo, type Routes, stubApi } from '@/test/stub-api';
import { EditorialNotice } from '../editorial/editorial-notice';
import { useEditorialNotice } from '../editorial/notice-store';
import { createMatchStore, MatchStoreProvider } from '../store';
import { ApprovalQueue } from './approval-queue';
import { copyFitOf } from './copy-fit';
import { PublishPolicySwitch } from './publish-policy-switch';

const AT = '2026-10-24T14:05:00.000Z';
const AUDIT_ID = '0b9c8e43-8f3e-4c43-9a34-0a5f8c3a1d11';

const access = vi.hoisted(() => ({ allowed: true }));
vi.mock('@/lib/auth/session-store', async (importOriginal) => ({
  ...(await importOriginal<typeof SessionStore>()),
  useCan: () => access.allowed,
}));

const waiting: OverlayReview = {
  overlayId: 'ov_1',
  insightId: 'in_1',
  fixtureId: FX,
  revision: 2,
  state: 'AWAITING_APPROVAL',
  cue: cue({ insightId: 'in_1', revision: 2, status: 'VERIFIED' }),
  period: 1,
  expiresAtClockMs: 605_000,
  waitingSince: AT,
  approvalDeadline: '2026-10-24T14:05:38.000Z',
};
const SERVER_TIME = AT;

const manualStatus = {
  fixtureId: FX,
  mode: 'AUTO',
  freeze: { active: false, changedAt: null },
  killSwitch: { active: false, changedAt: null },
  publishPolicy: { policy: 'MANUAL', changedAt: AT },
} as const;

const renderWith = (ui: ReactNode, routes: Routes, allowed = true) => {
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

const bodyOf = (call: [unknown, RequestInit?] | undefined) =>
  JSON.parse(String(call?.[1]?.body)) as Record<string, unknown>;

describe('approval queue', () => {
  beforeEach(() => useEditorialNotice.setState({ notice: null }));
  afterEach(() => vi.unstubAllGlobals());

  it('is hidden from roles that cannot approve', () => {
    renderWith(<ApprovalQueue />, {}, false);
    expect(screen.queryByTestId('approval-queue')).not.toBeInTheDocument();
  });

  it('shows a waiting graphic with its preview and copy fit, then sends it to air with the chosen adjustments', async () => {
    const { api, user } = renderWith(<ApprovalQueue />, {
      'GET /overlay-reviews': {
        body: { items: [waiting], serverTime: SERVER_TIME },
      },
      'POST /insights/in_1/review': {
        body: {
          insightId: 'in_1',
          overlayId: 'ov_1',
          fixtureId: FX,
          revision: 2,
          state: 'APPROVED',
          changed: true,
          auditId: AUDIT_ID,
          cue: { ...waiting.cue, status: 'APPROVED' },
        },
      },
    });
    expect(await screen.findByText('1 waiting')).toBeVisible();
    const queue = screen.getByTestId('approval-queue');
    expect(
      within(queue).getByRole('group', { name: 'Preview: Shot burst' }),
    ).toBeVisible();
    expect(within(queue).getByTestId('copy-fit')).toHaveTextContent('Fits');
    expect(within(queue).getByText('Updated wording')).toBeVisible();
    expect(within(queue).getByTestId('approval-countdown')).toHaveTextContent(
      /^Send within (37|38) s$/,
    );

    await user.click(within(queue).getByRole('radio', { name: /6 seconds/ }));
    await user.click(within(queue).getByRole('radio', { name: 'Top' }));
    await user.click(
      within(queue).getByRole('button', { name: 'Send to air: Shot burst' }),
    );
    await waitFor(() =>
      expect(callsTo(api, '/insights/in_1/review')).toHaveLength(1),
    );
    const [call] = callsTo(api, '/insights/in_1/review');
    expect(bodyOf(call)).toEqual({
      decision: 'APPROVE',
      revision: 2,
      durationMs: 6_000,
      priority: 100,
    });
    expect(
      (call?.[1]?.headers as Record<string, string>)['Idempotency-Key'],
    ).toMatch(/^[0-9a-f-]{36}$/);
    expect(await screen.findByText('Sent to air.')).toBeVisible();
  });

  it("drops a graphic with Don't air and explains a missed moment plainly", async () => {
    const { api, user } = renderWith(<ApprovalQueue />, {
      'GET /overlay-reviews': {
        body: { items: [waiting], serverTime: SERVER_TIME },
      },
      'POST /insights/in_1/review': {
        status: 409,
        body: {
          type: 'urn:matchiq:problem:overlay-approval-expired',
          title:
            'The cue waited past its approval window and can no longer air',
          status: 409,
        },
      },
    });
    await user.click(
      await screen.findByRole('button', { name: "Don't air: Shot burst" }),
    );
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Its moment has passed');
    expect(alert).not.toHaveTextContent('slot');
    expect(bodyOf(callsTo(api, '/review')[0])).toEqual({
      decision: 'REJECT',
      revision: 2,
    });
  });

  it('says graphics go on air automatically when nothing waits in Auto', async () => {
    renderWith(<ApprovalQueue />, {
      'GET /overlay-reviews': { body: { items: [], serverTime: SERVER_TIME } },
    });
    expect(
      await screen.findByText('Graphics go on air automatically'),
    ).toBeVisible();
  });

  it('refetches when the stream announces a review change, and offers a retry on failure', async () => {
    let calls = 0;
    const { store, user } = renderWith(<ApprovalQueue />, {
      'GET /overlay-reviews': () =>
        ++calls === 1
          ? {
              status: 409,
              body: { type: 'about:blank', title: 'Conflict', status: 409 },
            }
          : { body: { items: [], serverTime: SERVER_TIME } },
    });
    const retry = await screen.findByRole('button', { name: /try again/i });
    await user.click(retry);
    store.getState().applyEditorial(manualStatus);
    expect(await screen.findByText('Nothing waiting')).toBeVisible();
    store
      .getState()
      .applyMessages([
        message(
          'overlay.review',
          { overlayId: 'ov_1', revision: 1, state: 'AWAITING_APPROVAL' },
          4,
        ),
      ]);
    await waitFor(() => expect(calls).toBe(3));
  });
});

describe('publish policy switch', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('confirms with a reason before switching to Manual', async () => {
    const { api, store, user } = renderWith(<PublishPolicySwitch />, {
      'POST /editorial/publish-policy': {
        body: { status: manualStatus, changed: true, auditId: AUDIT_ID },
      },
    });
    await user.click(screen.getByRole('radio', { name: 'Manual' }));
    const dialog = screen.getByRole('dialog', {
      name: 'Check each graphic before it airs',
    });
    await user.type(within(dialog).getByLabelText('Reason'), 'Derby day');
    await user.click(
      within(dialog).getByRole('button', { name: 'Switch to Manual' }),
    );
    await waitFor(() =>
      expect(store.getState().editorial?.publishPolicy?.policy).toBe('MANUAL'),
    );
    expect(bodyOf(callsTo(api, '/publish-policy')[0])).toEqual({
      policy: 'MANUAL',
      reason: 'Derby day',
    });
  });

  it('shows the policy read-only without permission', () => {
    renderWith(<PublishPolicySwitch />, {}, false);
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(screen.getByText('No approval needed')).toBeVisible();
  });
});

describe('copyFitOf', () => {
  it('reads fits, tight and too long against the overlay limits', () => {
    expect(copyFitOf({ headline: 'Short', body: '' }).level).toBe('fits');
    expect(copyFitOf({ headline: 'x'.repeat(58), body: '' }).level).toBe(
      'tight',
    );
    expect(copyFitOf({ headline: 'ok', body: 'x'.repeat(141) }).level).toBe(
      'over',
    );
  });
});

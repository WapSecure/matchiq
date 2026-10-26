import type { OverlayReview } from '@matchiq/contracts';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SHORTCUTS_STORAGE_KEY } from '@/constants/approval-shortcuts';
import { createQueryClient } from '@/lib/api/query-provider';
import type * as SessionStore from '@/lib/auth/session-store';
import { cue, FX } from '@/test/factories';
import { callsTo, stubApi } from '@/test/stub-api';
import { useEditorialNotice } from '../editorial/notice-store';
import { createMatchStore, MatchStoreProvider } from '../store';
import { ApprovalQueue } from './approval-queue';

vi.mock('@/lib/auth/session-store', async (importOriginal) => ({
  ...(await importOriginal<typeof SessionStore>()),
  useCan: () => true,
}));

const AT = '2026-10-24T14:05:00.000Z';
const review = (id: string, deadline: string): OverlayReview => ({
  overlayId: `ov_${id}`,
  insightId: `in_${id}`,
  fixtureId: FX,
  revision: 1,
  state: 'AWAITING_APPROVAL',
  cue: cue({
    insightId: `in_${id}`,
    revision: 1,
    status: 'VERIFIED',
    headline: `Graphic ${id}`,
  }),
  period: 1,
  expiresAtClockMs: 605_000,
  waitingSince: AT,
  approvalDeadline: deadline,
});

const decided = (id: string, state: 'APPROVED' | 'REJECTED') => ({
  [`POST /insights/in_${id}/review`]: {
    body: {
      insightId: `in_${id}`,
      overlayId: `ov_${id}`,
      fixtureId: FX,
      revision: 1,
      state,
      changed: true,
      auditId: '0b9c8e43-8f3e-4c43-9a34-0a5f8c3a1d11',
      cue: { ...review(id, AT).cue, status: state },
    },
  },
});

const setup = (items: OverlayReview[], extra = {}) => {
  const api = stubApi({
    'GET /overlay-reviews': { body: { items, serverTime: AT } },
    ...decided('1', 'APPROVED'),
    ...extra,
  });
  render(
    <QueryClientProvider client={createQueryClient()}>
      <MatchStoreProvider fixtureId={FX} store={createMatchStore(FX)}>
        <input aria-label="Notes outside" />
        <ApprovalQueue />
      </MatchStoreProvider>
    </QueryClientProvider>,
  );
  return { api, user: userEvent.setup() };
};

const FAR = '2026-10-24T14:06:00.000Z';
const itemFor = async (name: string) =>
  screen.findByRole('listitem', { name: `Waiting graphic: ${name}` });

describe('approval shortcuts', () => {
  beforeEach(() => {
    localStorage.clear();
    useEditorialNotice.setState({ notice: null });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('sends to air with A or Enter and holds back with D, only when a graphic has focus', async () => {
    const { api, user } = setup([review('1', FAR)]);
    const item = await itemFor('Graphic 1');
    await user.keyboard('a');
    expect(callsTo(api, '/insights/in_1/review')).toHaveLength(0);
    act(() => item.focus());
    await user.keyboard('{Enter}');
    await waitFor(() =>
      expect(callsTo(api, '/insights/in_1/review')).toHaveLength(1),
    );
    expect(
      JSON.parse(String(callsTo(api, '/insights/in_1/review')[0]?.[1]?.body)),
    ).toEqual({
      decision: 'APPROVE',
      revision: 1,
    });
  });

  it('holds back with D from a focused button', async () => {
    const { api, user } = setup([review('1', FAR)], decided('1', 'REJECTED'));
    await itemFor('Graphic 1');
    const button = screen.getByRole('button', { name: /Send to air/ });
    act(() => button.focus());
    await user.keyboard('d');
    await waitFor(() =>
      expect(callsTo(api, '/insights/in_1/review')).toHaveLength(1),
    );
    expect(
      JSON.parse(String(callsTo(api, '/insights/in_1/review')[0]?.[1]?.body)),
    ).toEqual({
      decision: 'REJECT',
      revision: 1,
    });
  });

  it('ignores keys with a modifier held, in text fields and on the adjust radios', async () => {
    const { api, user } = setup([review('1', FAR)]);
    const item = await itemFor('Graphic 1');
    act(() => item.focus());
    await user.keyboard('{Control>}a{/Control}');
    await user.click(screen.getByLabelText('Notes outside'));
    await user.keyboard('ad');
    act(() => screen.getAllByRole('radio')[0]?.focus());
    await user.keyboard('a');
    expect(callsTo(api, '/insights/in_1/review')).toHaveLength(0);
  });

  it('is ignored when the switch is off, and the choice is remembered', async () => {
    const { api, user } = setup([review('1', FAR)]);
    const item = await itemFor('Graphic 1');
    await user.click(
      screen.getByRole('switch', { name: 'Keyboard shortcuts' }),
    );
    expect(localStorage.getItem(SHORTCUTS_STORAGE_KEY)).toBe('off');
    act(() => item.focus());
    await user.keyboard('a{Enter}');
    expect(callsTo(api, '/insights/in_1/review')).toHaveLength(0);
    expect(screen.queryByText('Shortcut: A', { exact: false })).toBeNull();
  });

  it('starts off when this device turned shortcuts off', async () => {
    localStorage.setItem(SHORTCUTS_STORAGE_KEY, 'off');
    setup([review('1', FAR)]);
    await itemFor('Graphic 1');
    await waitFor(() =>
      expect(
        screen.getByRole('switch', { name: 'Keyboard shortcuts' }),
      ).not.toBeChecked(),
    );
  });

  it('moves between waiting graphics with J, K and the arrows', async () => {
    const { user } = setup([review('1', FAR), review('2', FAR)]);
    const first = await itemFor('Graphic 1');
    const second = await itemFor('Graphic 2');
    act(() => first.focus());
    await user.keyboard('j');
    expect(second).toHaveFocus();
    await user.keyboard('k');
    expect(first).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(second).toHaveFocus();
  });

  it('lists the keys with ? and describes them without changing button names', async () => {
    const { user } = setup([review('1', FAR)]);
    const item = await itemFor('Graphic 1');
    const send = screen.getByRole('button', { name: 'Send to air: Graphic 1' });
    expect(send).toHaveAccessibleDescription(/Shortcut: A/);
    act(() => item.focus());
    await user.keyboard('?');
    const dialog = await screen.findByRole('dialog', {
      name: 'Keyboard shortcuts',
    });
    expect(
      within(dialog).getByText('Move to the next waiting graphic'),
    ).toBeVisible();
  });

  it('keeps the decided graphic in place with a calm confirmation', async () => {
    const { user } = setup([review('1', FAR)]);
    const item = await itemFor('Graphic 1');
    act(() => item.focus());
    await user.keyboard('a');
    const done = await screen.findByTestId('settled-review');
    expect(done).toHaveTextContent(/^Sent to air at \d{2}:\d{2}/);
    expect(screen.queryByText('Sent to air.')).toBeNull();
    await waitFor(() =>
      expect(
        screen.getByRole('status', { name: 'Latest decisions' }),
      ).toHaveTextContent(/Sent to air at \d{2}:\d{2}: Graphic 1/),
    );
  });
});

describe('approval countdown', () => {
  it('shows an urgent state in words and an icon at ten seconds or less', async () => {
    setup([review('1', '2026-10-24T14:05:08.000Z')]);
    const badge = await screen.findByTestId('approval-countdown');
    expect(badge).toHaveTextContent(/^Send within [78] s$/);
    expect(badge.querySelector('svg')).not.toBeNull();
  });

  it('explains plainly when time runs out', async () => {
    setup([review('1', '2026-10-24T14:05:01.000Z')]);
    const done = await screen.findByTestId(
      'settled-review',
      {},
      { timeout: 4_000 },
    );
    expect(done).toHaveTextContent('Time ran out, so it stayed off air');
  });
});

import type { MatchEvent } from '@matchiq/contracts';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PLAYER_FOCUS_COPY as C } from '@/constants/player-focus';
import { usePreferences } from '@/features/preferences/preferences-store';
import { fixture, shot } from '@/test/factories';
import { type LedgerView, PlayerFocusBody } from './player-focus-body';

const FIXTURE = fixture();
const STRIKER = 'pl_hmu9';
const STRIKER_NAME = 'HMU Player 9';

const ledger = (
  events: MatchEvent[],
  overrides: Partial<LedgerView> = {},
): LedgerView => ({
  events,
  status: 'ready',
  error: null,
  retry: vi.fn(),
  ...overrides,
});

const goal = (sequence: number, shotEventId: string): MatchEvent => {
  const { schemaVersion, fixtureId, period, wallClockUtc, provenance } =
    shot(sequence);
  return {
    schemaVersion,
    eventId: `ev_${sequence}`,
    fixtureId,
    sequence,
    period,
    matchClockMs: sequence * 1_000,
    wallClockUtc,
    provenance,
    type: 'GOAL',
    teamId: 'tm_home',
    playerId: 'pl_hmu9',
    shotEventId,
    ownGoal: false,
  };
};

const renderBody = (view: LedgerView, onOpenMoment?: (id: string) => void) =>
  render(
    <PlayerFocusBody
      fixture={FIXTURE}
      ledger={view}
      moments={[
        {
          id: 'in_goal',
          headline: 'Home United score',
          period: 1,
          clockMs: 61_000,
          eventIds: ['ev_2'],
        },
        {
          id: 'in_other',
          headline: 'Away City press high',
          period: 1,
          clockMs: 90_000,
          eventIds: ['ev_99'],
        },
      ]}
      onOpenMoment={onOpenMoment}
    />,
  );

describe('PlayerFocusBody', () => {
  beforeEach(() => {
    usePreferences.setState({ followedPlayerIds: [] });
  });

  it('asks the viewer to pick a player and shows the no-tracking badge', () => {
    renderBody(ledger([]));
    expect(screen.getByText(C.pickTitle)).toBeInTheDocument();
    expect(screen.getByTestId('no-tracking-badge')).toHaveTextContent(
      C.noTracking,
    );
  });

  it('follows a player chosen with the keyboard from the squad combobox', async () => {
    const user = userEvent.setup();
    renderBody(ledger([shot(1)]));
    const input = screen.getByRole('combobox', { name: C.pickerLabel });
    await user.type(input, 'HMU Player 9');
    await user.keyboard('{ArrowDown}{Enter}');
    expect(usePreferences.getState().followedPlayerIds).toEqual([STRIKER]);
    expect(
      screen.getByLabelText(C.countsLabel(STRIKER_NAME)),
    ).toBeInTheDocument();
  });

  it('counts the followed player’s actions, milestones and key moments', async () => {
    usePreferences.setState({ followedPlayerIds: [STRIKER] });
    const open = vi.fn();
    renderBody(ledger([shot(1), goal(2, 'ev_1'), shot(3)]), open);
    const counts = screen.getByLabelText(C.countsLabel(STRIKER_NAME));
    expect(within(counts).getByText('Shots').nextSibling).toHaveTextContent(
      '2',
    );
    expect(within(counts).getByText('Goals').nextSibling).toHaveTextContent(
      '1',
    );
    const milestones = screen.getByRole('region', { name: C.milestonesTitle });
    expect(within(milestones).getByText('First shot on target')).toBeVisible();
    expect(within(milestones).getByText('Goal')).toBeVisible();
    const moments = screen.getByRole('region', { name: C.momentsTitle });
    expect(within(moments).getByText('Home United score')).toBeVisible();
    expect(within(moments).queryByText('Away City press high')).toBeNull();
    await userEvent.click(
      within(moments).getByRole('button', {
        name: C.openMoment('Home United score'),
      }),
    );
    expect(open).toHaveBeenCalledWith('in_goal');
  });

  it('says so when the followed player has not been involved yet', () => {
    usePreferences.setState({ followedPlayerIds: ['pl_awc4'] });
    renderBody(ledger([shot(1)]));
    expect(screen.getByText(C.quietTitle('AWC Player 4'))).toBeVisible();
  });

  it('shows loading, then a plain error with a retry', async () => {
    usePreferences.setState({ followedPlayerIds: [STRIKER] });
    const { rerender } = renderBody(ledger([], { status: 'loading' }));
    expect(screen.getByRole('status', { name: C.loading })).toBeVisible();
    const retry = vi.fn();
    rerender(
      <PlayerFocusBody
        fixture={FIXTURE}
        ledger={ledger([], {
          status: 'error',
          error: new TypeError('Failed to fetch'),
          retry,
        })}
        moments={[]}
      />,
    );
    const alert = screen.getByRole('alert');
    expect(alert).not.toHaveTextContent('Failed to fetch');
    await userEvent.click(within(alert).getByRole('button'));
    expect(retry).toHaveBeenCalled();
  });

  it('switches between followed players and stops following', async () => {
    usePreferences.setState({ followedPlayerIds: [STRIKER, 'pl_awc4'] });
    renderBody(ledger([shot(1)]));
    await userEvent.click(
      screen.getByRole('button', { name: C.switchTo('AWC Player 4') }),
    );
    expect(usePreferences.getState().followedPlayerIds[0]).toBe('pl_awc4');
    await userEvent.click(
      screen.getByRole('button', { name: C.stopFollowing('AWC Player 4') }),
    );
    expect(usePreferences.getState().followedPlayerIds).toEqual([STRIKER]);
  });
});

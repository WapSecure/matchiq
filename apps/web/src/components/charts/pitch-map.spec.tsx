import type { MatchEvent } from '@matchiq/contracts';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { buildRoster } from '@/features/studio/lib/roster';
import { AWAY, fixture, shot } from '@/test/factories';
import { buildPitchMarks, filterMarks, toScreen } from './pitch-events';
import { PitchMap } from './pitch-map';

const roster = buildRoster(fixture());

const at = (base: MatchEvent, patch: Record<string, unknown>): MatchEvent =>
  ({ ...base, ...patch }) as MatchEvent;

const EVENTS: MatchEvent[] = [
  at(shot(1), { location: { x: 90, y: 20 } }),
  at(shot(2), { type: 'GOAL', shotEventId: 'ev_1', ownGoal: false }),
  at(shot(3), {
    teamId: AWAY,
    playerId: 'pl_awc4',
    location: { x: 80, y: 30 },
    outcome: 'OFF_TARGET',
  }),
  at(shot(4), {
    type: 'RECOVERY',
    teamId: AWAY,
    playerId: 'pl_awc5',
    location: { x: 40, y: 60 },
    outcome: undefined,
    bodyPart: undefined,
  }),
  at(shot(5), {
    type: 'FINAL_THIRD_ENTRY',
    playerId: 'pl_hmu7',
    location: { x: 70, y: 50 },
  }),
  at(shot(6), { teamId: 'tm_unknown' }),
];

describe('pitch coordinates', () => {
  it('keeps home attacking to the right with its right touchline at the bottom', () => {
    expect(toScreen({ x: 90, y: 20 }, 'home')).toEqual({ x: 90, y: 80 });
  });

  it('rotates the away side 180° so it attacks to the left', () => {
    expect(toScreen({ x: 90, y: 20 }, 'away')).toEqual({ x: 10, y: 20 });
  });
});

describe('buildPitchMarks', () => {
  it('draws goals at their shot, maps teams and skips unknown teams', () => {
    const marks = buildPitchMarks(EVENTS, roster);
    expect(marks.map((m) => [m.id, m.kind, m.side])).toEqual([
      ['ev_1', 'GOAL', 'home'],
      ['ev_3', 'SHOT', 'away'],
      ['ev_4', 'RECOVERY', 'away'],
      ['ev_5', 'FINAL_THIRD_ENTRY', 'home'],
    ]);
    const away = marks[1];
    expect(away?.onTarget).toBe(false);
    expect([away?.x, away?.y]).toEqual([20, 30]);
    expect(marks[0]?.player).toBe('HMU Player 9 (9)');
  });

  it('leaves voided events off the map and un-scores a voided goal', () => {
    const marks = buildPitchMarks(EVENTS, roster, {
      ev_2: 'VAR overturned',
      ev_4: 'duplicate',
    });
    expect(marks.find((m) => m.id === 'ev_1')?.kind).toBe('SHOT');
    expect(marks.some((m) => m.id === 'ev_4')).toBe(false);
  });

  it('filters by team and type', () => {
    const marks = buildPitchMarks(EVENTS, roster);
    const all = new Set([
      'GOAL',
      'SHOT',
      'RECOVERY',
      'FINAL_THIRD_ENTRY',
    ] as const);
    expect(filterMarks(marks, { team: 'away', kinds: all })).toHaveLength(2);
    expect(
      filterMarks(marks, { team: 'all', kinds: new Set(['GOAL'] as const) }),
    ).toHaveLength(1);
  });
});

describe('PitchMap', () => {
  const renderMap = () =>
    render(
      <PitchMap
        marks={buildPitchMarks(EVENTS, roster)}
        length={105}
        width={68}
        homeShort="HMU"
        awayShort="AWC"
      />,
    );
  const plotted = (container: HTMLElement) =>
    container.querySelectorAll('[data-mark]');

  it('exposes a described image and a matching table alternative', async () => {
    const user = userEvent.setup();
    renderMap();
    expect(
      screen.getByRole('img', { name: /Pitch event map 4 events plotted/ }),
    ).toBeInTheDocument();
    const toggle = screen.getByRole('button', { name: 'View as table' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(toggle);
    const rows = within(screen.getByRole('table')).getAllByRole('row');
    expect(rows).toHaveLength(5);
    expect(rows[1]).toHaveTextContent('Goal');
    expect(rows[2]).toHaveTextContent('Shot · Off target');
    expect(rows[2]).toHaveTextContent('80, 30');
  });

  it('lets keyboard users reach the scrolling table', async () => {
    const user = userEvent.setup();
    renderMap();
    await user.click(screen.getByRole('button', { name: 'View as table' }));
    const region = screen.getByRole('region', { name: /Pitch event map/ });
    expect(region).toHaveAttribute('tabindex', '0');
    expect(region).toContainElement(screen.getByRole('table'));
  });

  it('filters by team and event type, plot and table together', async () => {
    const user = userEvent.setup();
    const { container } = renderMap();
    await user.click(screen.getByRole('radio', { name: 'AWC' }));
    expect(plotted(container)).toHaveLength(2);
    expect(
      container.querySelectorAll('[data-side="home"][data-mark]'),
    ).toHaveLength(0);
    await user.click(screen.getByRole('checkbox', { name: /Recoveries/ }));
    expect(plotted(container)).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'View as table' }));
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(
      2,
    );
    expect(
      screen.getByRole('checkbox', { name: /Recoveries/ }),
    ).not.toBeChecked();
  });

  it('shows details for the hovered mark', async () => {
    const user = userEvent.setup();
    const { container } = renderMap();
    const goal = container.querySelector('[data-mark="GOAL"]');
    if (!goal) throw new Error('goal mark missing');
    await user.hover(goal);
    expect(screen.getByText(/HMU · Goal · HMU Player 9/)).toBeInTheDocument();
  });
});

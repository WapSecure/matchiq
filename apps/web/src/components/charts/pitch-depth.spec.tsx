import type { MatchEvent } from '@matchiq/contracts';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { buildRoster } from '@/features/studio/lib/roster';
import { AWAY, fixture, shot } from '@/test/factories';
import { buildPitchMarks } from './pitch-events';
import { buildPassArrows, difficultyBand, selectPasses } from './pitch-passes';
import { PitchMap } from './pitch-map';
import { selectShots, shotRadius, shotSpeedLabel } from './pitch-shots';

const fx = fixture();
const roster = buildRoster(fx);
const PITCH = fx.pitch;

const must = <T,>(value: T | undefined): T => {
  if (value === undefined) throw new Error('missing test value');
  return value;
};

const at = (base: MatchEvent, patch: Record<string, unknown>): MatchEvent =>
  ({ ...base, ...patch }) as MatchEvent;

const SHOTS: MatchEvent[] = [
  at(shot(1), { outcome: 'ON_TARGET', speedKph: 92.46 }),
  at(shot(2), { type: 'GOAL', shotEventId: 'ev_1', ownGoal: false }),
  at(shot(3), { outcome: 'OFF_TARGET' }),
  at(shot(4), { outcome: 'BLOCKED', teamId: AWAY, playerId: 'pl_awc4' }),
];

const attempt = (
  n: number,
  to: { x: number; y: number },
  extra: Record<string, unknown> = {},
): MatchEvent[] => [
  at(shot(n * 2 + 10), {
    type: 'PASS_ATTEMPTED',
    location: { x: 20, y: 50 },
    targetLocation: to,
    underPressure: false,
    outcome: undefined,
    bodyPart: undefined,
    ...extra,
  }),
  at(shot(n * 2 + 11), {
    type: 'PASS_COMPLETED',
    attemptEventId: `ev_${n * 2 + 10}`,
    location: to,
    outcome: undefined,
    bodyPart: undefined,
    ...extra,
  }),
];

const PASSES: MatchEvent[] = Array.from({ length: 15 }, (_, i) =>
  attempt(i, { x: 25 + i * 4, y: 50 }),
).flat();

describe('shot map mapping', () => {
  const marks = buildPitchMarks(SHOTS, roster);

  it('sizes markers by outcome: goal, on target, then off target and blocked', () => {
    const [goal, off, blocked] = [
      must(marks[0]),
      must(marks[1]),
      must(marks[2]),
    ];
    const onTarget = { ...goal, kind: 'SHOT' as const };
    expect(shotRadius(goal)).toBeGreaterThan(shotRadius(onTarget));
    expect(shotRadius(onTarget)).toBeGreaterThan(shotRadius(off));
    expect(shotRadius(off)).toBe(shotRadius(blocked));
  });

  it('formats speed only when the event has one', () => {
    expect(shotSpeedLabel(must(marks[0]))).toBe('92.5 km/h');
    expect(shotSpeedLabel(must(marks[1]))).toBeNull();
  });

  it('keeps the selected team, and is empty for a team with no shots', () => {
    expect(selectShots(marks, 'away')).toHaveLength(1);
    expect(selectShots(marks, 'all')).toHaveLength(3);
    expect(selectShots([], 'home')).toEqual([]);
  });
});

describe('pass map mapping', () => {
  const arrows = buildPassArrows(PASSES, roster, PITCH);

  it('measures only completed passes and skips voided ones', () => {
    expect(arrows).toHaveLength(15);
    const lonely = must(attempt(40, { x: 90, y: 50 })[0]);
    expect(buildPassArrows([lonely], roster, PITCH)).toEqual([]);
    expect(
      buildPassArrows(PASSES, roster, PITCH, { ev_10: 'duplicate' }),
    ).toHaveLength(14);
  });

  it('keeps the top 12 per team, hardest first, longest on ties', () => {
    const { shown, total } = selectPasses(arrows, 'home');
    expect(total).toBe(15);
    expect(shown).toHaveLength(12);
    const scores = shown.map((p) => p.difficulty);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
    expect(shown[0]?.distanceM).toBeGreaterThan(shown[11]?.distanceM ?? 0);
  });

  it('caps each team separately and returns nothing for an empty team', () => {
    const mixed = [
      ...PASSES,
      ...attempt(30, { x: 80, y: 50 }, { teamId: AWAY }),
    ];
    const all = selectPasses(buildPassArrows(mixed, roster, PITCH), 'all');
    expect(all.shown.filter((p) => p.side === 'away')).toHaveLength(1);
    expect(selectPasses(arrows, 'away').shown).toEqual([]);
  });

  it('bands difficulty at the documented cut-offs', () => {
    expect(difficultyBand(10)).toBe('lower');
    expect(difficultyBand(40)).toBe('medium');
    expect(difficultyBand(60)).toBe('higher');
  });
});

describe('PitchMap views', () => {
  const renderMap = (analyst = false) =>
    render(
      <PitchMap
        marks={buildPitchMarks(SHOTS, roster)}
        passes={buildPassArrows(PASSES, roster, PITCH)}
        length={105}
        width={68}
        homeShort="HMU"
        awayShort="AWC"
        analyst={analyst}
      />,
    );

  it('switches between Events, Shots and Passes', async () => {
    const user = userEvent.setup();
    const { container } = renderMap();
    expect(container.querySelectorAll('[data-mark]').length).toBeGreaterThan(0);
    await user.click(screen.getByRole('radio', { name: 'Shots' }));
    expect(container.querySelectorAll('[data-shot]')).toHaveLength(3);
    await user.click(screen.getByRole('radio', { name: 'Passes' }));
    expect(container.querySelectorAll('[data-pass]')).toHaveLength(12);
    expect(screen.getByText(/hardest-rated completed passes/)).toBeVisible();
  });

  it('lists shot speed in the table and hides xG outside the Analyst view', async () => {
    const user = userEvent.setup();
    renderMap();
    await user.click(screen.getByRole('radio', { name: 'Shots' }));
    await user.click(screen.getByRole('button', { name: 'View as table' }));
    const table = screen.getByRole('table');
    expect(within(table).getByText('92.5 km/h')).toBeInTheDocument();
    expect(screen.queryByText(/xG baseline/)).not.toBeInTheDocument();
  });

  it('shows the xG baseline with its label for analysts', async () => {
    const user = userEvent.setup();
    renderMap(true);
    await user.click(screen.getByRole('radio', { name: 'Shots' }));
    await user.click(screen.getByRole('button', { name: 'View as table' }));
    expect(
      screen.getByRole('columnheader', {
        name: 'xG baseline (synthetic, not calibrated)',
      }),
    ).toBeInTheDocument();
  });

  it('steps through passes by keyboard and lists distance and difficulty', async () => {
    const user = userEvent.setup();
    renderMap();
    await user.click(screen.getByRole('radio', { name: 'Passes' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText(/Synthetic difficulty \d+/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'View as table' }));
    const rows = within(screen.getByRole('table')).getAllByRole('row');
    expect(rows).toHaveLength(13);
    expect(rows[0]).toHaveTextContent('Difficulty (synthetic)');
    expect(rows[1]).toHaveTextContent(/\d+\.\d m/);
  });

  it('says so when a team has no shots or passes', async () => {
    const user = userEvent.setup();
    render(
      <PitchMap
        marks={buildPitchMarks([must(SHOTS[0])], roster)}
        length={105}
        width={68}
        homeShort="HMU"
        awayShort="AWC"
      />,
    );
    await user.click(screen.getByRole('radio', { name: 'Shots' }));
    await user.click(screen.getByRole('radio', { name: 'AWC' }));
    expect(screen.getByText('No shots for this team yet.')).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'Passes' }));
    expect(
      screen.getByText('No completed passes for this team yet.'),
    ).toBeInTheDocument();
  });
});

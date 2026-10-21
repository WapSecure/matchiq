import type {
  MetricValue,
  PossessionBasis,
  TeamMatchMetrics,
} from '@matchiq/contracts';
import { PERCENT, ROUNDING } from '../constants.js';
import { possessionTotals } from '../projection/possession.js';
import type { DerivedState, Side, TeamTally } from '../types.js';
import { roundTo } from '../util/numbers.js';
import { momentumFor } from './momentum.js';
import { rollingWindow } from './windows.js';

export const percentOf = (
  numerator: number,
  denominator: number,
): MetricValue =>
  denominator === 0
    ? { status: 'unavailable', reason: 'ZERO_DENOMINATOR' }
    : {
        status: 'available',
        value: roundTo(
          (numerator / denominator) * PERCENT,
          ROUNDING.percentDecimals,
        ),
        unit: 'percent',
        numerator,
        denominator,
      };

interface PossessionMetric {
  readonly basis: PossessionBasis;
  readonly value: Readonly<Record<Side, MetricValue>>;
}

/** See `possessionPct` in the metric registry for the exact definition. */
export const possessionMetric = (derived: DerivedState): PossessionMetric => {
  if (derived.possession.changeEvents === 0) {
    const home = derived.tallies.home.passesAttempted;
    const away = derived.tallies.away.passesAttempted;
    return {
      basis: 'EVENT_SHARE_PROXY',
      value: {
        home: percentOf(home, home + away),
        away: percentOf(away, home + away),
      },
    };
  }
  const totals = possessionTotals(
    derived.possession,
    derived.period,
    derived.clockMs,
  );
  const controlled = totals.home + totals.away;
  return {
    basis: 'TIME_WEIGHTED',
    value: {
      home: percentOf(totals.home, controlled),
      away: percentOf(totals.away, controlled),
    },
  };
};

const momentumNow = (derived: DerivedState, side: Side): MetricValue =>
  derived.period === null
    ? { status: 'unavailable', reason: 'INSUFFICIENT_SAMPLE' }
    : momentumFor(
        derived.timelines,
        side,
        rollingWindow(
          derived.period,
          derived.clockMs,
          derived.periodStartClockMs,
        ),
      ).value;

const countsOf = (tally: TeamTally) => ({
  goals: tally.goals,
  shots: tally.shots,
  shotsOnTarget: tally.shotsOnTarget,
  passesAttempted: tally.passesAttempted,
  passesCompleted: tally.passesCompleted,
  pressures: tally.pressures,
  recoveries: tally.recoveries,
  finalThirdEntries: tally.finalThirdEntries,
  fouls: tally.fouls,
  yellowCards: tally.yellowCards,
  redCards: tally.redCards,
});

export const teamMetrics = (
  derived: DerivedState,
): Record<Side, TeamMatchMetrics> => {
  const possession = possessionMetric(derived);
  const build = (side: Side): TeamMatchMetrics => {
    const tally = derived.tallies[side];
    return {
      ...countsOf(tally),
      passCompletionPct: percentOf(
        tally.passesCompleted,
        tally.passesAttempted,
      ),
      possessionPct: possession.value[side],
      possessionBasis: possession.basis,
      momentum: momentumNow(derived, side),
    };
  };
  return { home: build('home'), away: build('away') };
};

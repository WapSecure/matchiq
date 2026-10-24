import type { MetricUnit } from '@matchiq/contracts';

/** A metric definition before it is expanded per side (`<base>.home`, `<base>.away`). */
export interface BaseMetricDefinition {
  readonly base: string;
  readonly label: string;
  readonly description: string;
  readonly formula: string;
  readonly unit: MetricUnit;
  readonly heuristic: boolean;
}

const count = (
  base: string,
  label: string,
  formula: string,
  description: string,
): BaseMetricDefinition => ({
  base,
  label,
  formula,
  description,
  unit: 'count',
  heuristic: false,
});

/** Whole-match totals, reported in `TeamMatchMetrics`. */
export const MATCH_METRICS: readonly BaseMetricDefinition[] = [
  count(
    'goals',
    'Goals',
    'count(GOAL where credited team = team)',
    'Goals from GOAL events only. An own goal (ownGoal=true) is credited to the opponent of the event team.',
  ),
  count(
    'shots',
    'Shots',
    'count(SHOT)',
    'All SHOT events by the team, any outcome.',
  ),
  count(
    'shotsOnTarget',
    'Shots on target',
    'count(SHOT where outcome = ON_TARGET)',
    'SHOT events with outcome ON_TARGET.',
  ),
  count(
    'passesAttempted',
    'Passes attempted',
    'count(PASS_ATTEMPTED)',
    'Accepted PASS_ATTEMPTED events.',
  ),
  count(
    'passesCompleted',
    'Passes completed',
    'count(distinct attemptEventId of PASS_COMPLETED linked to a same-team PASS_ATTEMPTED)',
    'Completions count once per attempt and only when the referenced attempt is applied and not voided.',
  ),
  {
    base: 'passCompletionPct',
    label: 'Pass completion',
    formula: 'passesCompleted / passesAttempted * 100',
    description:
      'Rounded to 1 decimal. Unavailable (ZERO_DENOMINATOR) when no passes were attempted.',
    unit: 'percent',
    heuristic: false,
  },
  {
    base: 'shotConversionPct',
    label: 'Shot conversion',
    formula: '(goals - ownGoalsFor) / shots * 100',
    description:
      "Share of the team's shots that became goals. Own goals credited to the team are excluded because they are not from its shots. Rounded to 1 decimal. Unavailable (ZERO_DENOMINATOR) when the team has had no shots.",
    unit: 'percent',
    heuristic: false,
  },
  {
    base: 'passQualityPct',
    label: 'Pass quality',
    formula:
      'count(completed passes with target.x - origin.x >= 10) / passesCompleted * 100',
    description:
      'Share of completed passes that moved the ball at least 10 pitch units (of 100) towards the opponent goal. A defined proxy, not a spec metric: it ignores defenders beaten, pass difficulty and what happens next. Unavailable (ZERO_DENOMINATOR) when no passes were completed.',
    unit: 'percent',
    heuristic: true,
  },
  {
    base: 'possessionPct',
    label: 'Possession',
    formula:
      'TIME_WEIGHTED: team controlled ms / (home + away controlled ms) * 100; EVENT_SHARE_PROXY: team passesAttempted / all passesAttempted * 100',
    description:
      'Time-weighted from POSSESSION_CHANGED segments within a period; contested (teamId null) and dead time are excluded from the denominator. Falls back to a labelled pass-share proxy only when no possession events exist. Rounded to 1 decimal by largest remainder, so home + away is exactly 100.',
    unit: 'percent',
    heuristic: false,
  },
  count(
    'pressures',
    'Pressures',
    'count(PRESSURE_APPLIED)',
    'PRESSURE_APPLIED events by the team.',
  ),
  count(
    'recoveries',
    'Recoveries',
    'count(RECOVERY)',
    'RECOVERY events by the team, anywhere on the pitch.',
  ),
  count(
    'highRecoveries',
    'High recoveries',
    'count(RECOVERY where location.x >= 60)',
    'Recoveries in the attacking 40% of the pitch (x in the acting team attacking direction).',
  ),
  count(
    'finalThirdEntries',
    'Final-third entries',
    'count(FINAL_THIRD_ENTRY)',
    'FINAL_THIRD_ENTRY events by the team.',
  ),
  count('fouls', 'Fouls', 'count(FOUL)', 'FOUL events committed by the team.'),
  count(
    'yellowCards',
    'Yellow cards',
    'count(CARD where card in [YELLOW, SECOND_YELLOW])',
    'Cautions shown. A SECOND_YELLOW counts as a caution and also as a dismissal in redCards.',
  ),
  count(
    'redCards',
    'Red cards',
    'count(CARD where card in [RED, SECOND_YELLOW])',
    'Dismissals: straight reds plus second yellows.',
  ),
];

/** Counts over the timeline kinds, reported per rolling 5-minute window. */
export const WINDOW_COUNT_METRICS: readonly BaseMetricDefinition[] =
  MATCH_METRICS.filter((m) =>
    [
      'shots',
      'shotsOnTarget',
      'pressures',
      'recoveries',
      'highRecoveries',
      'finalThirdEntries',
    ].includes(m.base),
  );

export const MOMENTUM_METRIC: BaseMetricDefinition = {
  base: 'momentum',
  label: 'Momentum index',
  formula:
    'sum_k w_k * clamp((count_k * 5min/covered - mean_k) / sd_k, -3, 3); w = shots .35, finalThirdEntries .25, pressures .20, highRecoveries .20',
  description:
    'Descriptive 5-minute heuristic in [-3, 3] against a fixed synthetic reference scale; 0 is reference activity. Not a win probability. INSUFFICIENT_SAMPLE under 2 minutes covered or fewer than 3 contributing events.',
  unit: 'index',
  heuristic: true,
};

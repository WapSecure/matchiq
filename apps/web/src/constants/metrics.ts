/**
 * Metric definitions for evidence tables, mirroring the engine registry
 * (`libs/football-engine` metrics/definitions.ts, algorithm 1.0.0). The engine
 * cannot be bundled into the browser (it hashes with `node:crypto`), so the
 * text is copied here until a `/metric-definitions` endpoint exists.
 * `plain` is the on-screen definition; `formula` is for Technical details.
 */
export const METRIC_BASES: Record<
  string,
  { label: string; plain: string; formula: string }
> = {
  goals: {
    label: 'Goals',
    plain: 'Goals credited to the team',
    formula: 'count(GOAL credited to team)',
  },
  shots: {
    label: 'Shots',
    plain: 'Every attempt at goal',
    formula: 'count(SHOT)',
  },
  shotsOnTarget: {
    label: 'Shots on target',
    plain: 'Attempts that would have gone in without a save',
    formula: 'count(SHOT where outcome = ON_TARGET)',
  },
  passesAttempted: {
    label: 'Passes attempted',
    plain: 'Every pass tried',
    formula: 'count(PASS_ATTEMPTED)',
  },
  passesCompleted: {
    label: 'Passes completed',
    plain: 'Passes that reached a teammate',
    formula: 'count(PASS_COMPLETED linked to a same-team attempt)',
  },
  passCompletionPct: {
    label: 'Pass completion',
    plain: 'Share of passes that reached a teammate',
    formula: 'passesCompleted / passesAttempted × 100',
  },
  shotConversionPct: {
    label: 'Shot conversion',
    plain: 'Share of the team’s shots that became goals',
    formula: '(goals − own goals credited) / shots × 100',
  },
  passQualityPct: {
    label: 'Pass quality',
    plain: 'Share of completed passes that moved the ball well forward',
    formula:
      'completed passes gaining ≥ 10 pitch units / passesCompleted × 100',
  },
  possessionPct: {
    label: 'Possession',
    plain: 'Share of the time the team had the ball',
    formula: 'team controlled ms / (home + away controlled ms) × 100',
  },
  pressures: {
    label: 'Pressures',
    plain: 'Times a player closed down an opponent on the ball',
    formula: 'count(PRESSURE_APPLIED)',
  },
  recoveries: {
    label: 'Recoveries',
    plain: 'Times the team won the ball back',
    formula: 'count(RECOVERY)',
  },
  highRecoveries: {
    label: 'High recoveries',
    plain: "Ball won back in the opponent's half",
    formula: 'count(RECOVERY where location.x ≥ 60)',
  },
  finalThirdEntries: {
    label: 'Final third entries',
    plain: 'Times the team carried or passed the ball into the final third',
    formula: 'count(FINAL_THIRD_ENTRY)',
  },
  fouls: {
    label: 'Fouls',
    plain: 'Fouls committed',
    formula: 'count(FOUL)',
  },
  yellowCards: {
    label: 'Yellow cards',
    plain: 'Bookings, including second yellows',
    formula: 'count(CARD: YELLOW, SECOND_YELLOW)',
  },
  redCards: {
    label: 'Red cards',
    plain: 'Sendings-off, including second yellows',
    formula: 'count(CARD: RED, SECOND_YELLOW)',
  },
  momentum: {
    label: 'Momentum',
    plain:
      'Who is on top: shots, final third entries, pressing and high ball wins in the last five minutes, compared with the match so far',
    formula:
      'Σ wₖ · clamp(z-score of countₖ per 5 min, −3, 3); w = shots .35, final third entries .25, pressures .20, high recoveries .20',
  },
};

export const METRIC_SIDES: Record<string, string> = {
  home: 'home',
  away: 'away',
};

export const METRIC_WINDOWS: Record<string, string> = {
  rolling5m: 'last 5 min',
  previous5m: 'the 5 min before',
};

export const METRIC_REF_SEPARATOR = '.';

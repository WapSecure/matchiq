/**
 * Metric definitions for evidence tables, mirroring the engine registry
 * (`libs/football-engine` metrics/definitions.ts, algorithm 1.0.0). The engine
 * cannot be bundled into the browser (it hashes with `node:crypto`), so the
 * text is copied here until a `/metric-definitions` endpoint exists.
 */
export const METRIC_BASES: Record<string, { label: string; formula: string }> =
  {
    goals: { label: 'Goals', formula: 'count(GOAL credited to team)' },
    shots: { label: 'Shots', formula: 'count(SHOT)' },
    shotsOnTarget: {
      label: 'Shots on target',
      formula: 'count(SHOT where outcome = ON_TARGET)',
    },
    passesAttempted: {
      label: 'Passes attempted',
      formula: 'count(PASS_ATTEMPTED)',
    },
    passesCompleted: {
      label: 'Passes completed',
      formula: 'count(PASS_COMPLETED linked to a same-team attempt)',
    },
    passCompletionPct: {
      label: 'Pass completion',
      formula: 'passesCompleted / passesAttempted × 100',
    },
    possessionPct: {
      label: 'Possession',
      formula: 'team controlled ms / (home + away controlled ms) × 100',
    },
    pressures: { label: 'Pressures', formula: 'count(PRESSURE_APPLIED)' },
    recoveries: { label: 'Recoveries', formula: 'count(RECOVERY)' },
    highRecoveries: {
      label: 'High recoveries',
      formula: 'count(RECOVERY where location.x ≥ 60)',
    },
    finalThirdEntries: {
      label: 'Final-third entries',
      formula: 'count(FINAL_THIRD_ENTRY)',
    },
    fouls: { label: 'Fouls', formula: 'count(FOUL)' },
    yellowCards: {
      label: 'Yellow cards',
      formula: 'count(CARD: YELLOW, SECOND_YELLOW)',
    },
    redCards: {
      label: 'Red cards',
      formula: 'count(CARD: RED, SECOND_YELLOW)',
    },
    momentum: {
      label: 'Momentum index',
      formula:
        'Σ wₖ · clamp(z-score of countₖ per 5 min, −3, 3); w = shots .35, final-third entries .25, pressures .20, high recoveries .20',
    },
  };

export const METRIC_SIDES: Record<string, string> = {
  home: 'home',
  away: 'away',
};

export const METRIC_WINDOWS: Record<string, string> = {
  rolling5m: 'latest 5 min',
  previous5m: 'previous 5 min',
};

export const METRIC_REF_SEPARATOR = '.';

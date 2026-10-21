interface MomentumPair {
  readonly now: number;
  readonly before: number;
  readonly opponentNow: number;
  readonly opponentBefore: number;
}

/**
 * Deterministic rationale and counter-evidence wording. Every number placed
 * in a rationale is also present in the insight's `computedMetrics`.
 */
export const RATIONALE = {
  goal: (team: string, home: number, away: number) =>
    `${team} scored; the score is now ${home}-${away}.`,
  ownGoal: (team: string, home: number, away: number) =>
    `An own goal was credited to ${team}; the score is now ${home}-${away}.`,
  redCard: (team: string, dismissals: number) =>
    `${team} had a player sent off (straight red); dismissals for the team: ${dismissals}.`,
  secondYellow: (team: string, dismissals: number) =>
    `${team} had a player sent off for a second yellow card; dismissals for the team: ${dismissals}.`,
  shotBurst: (team: string, shots: number) =>
    `${team} took ${shots} shots within five minutes of play; this suggests a spell of sustained attacking pressure.`,
  highRegains: (team: string, regains: number) =>
    `${team} made ${regains} recoveries high up the pitch within five minutes; this suggests an effective high press.`,
  pressureSwing: (team: string, now: number, before: number) =>
    `${team} applied ${now} pressures in the latest five minutes, up from ${before} in the five before; this suggests a rise in pressing intensity.`,
  momentumShift: (team: string, m: MomentumPair) =>
    `The momentum index favours ${team} at ${m.now} against ${m.opponentNow}, from ${m.before} against ${m.opponentBefore} in the previous five minutes; this suggests a shift in attacking momentum, not a prediction of the result.`,
} as const;

export const COUNTER = {
  opponentShots: (team: string, shots: number) =>
    `${team} also took ${shots} shots in the same window.`,
  opponentHighRegains: (team: string, regains: number) =>
    `${team} also made ${regains} high recoveries in the same window.`,
  opponentPressures: (team: string, pressures: number) =>
    `${team} applied ${pressures} pressures in the same window.`,
} as const;

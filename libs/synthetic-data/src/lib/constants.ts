export const GENERATOR_VERSION = '0.1.0';

export const SCENARIO_NAMES = [
  'comeback',
  'possession-dominance',
  'red-card-swing',
  'high-press',
  'low-event',
  'disallowed-goal',
] as const;

export const FIXTURE_DEFAULTS = {
  kickoffUtc: '2026-10-24T15:00:00.000Z',
  competitionLabel: 'MatchIQ Synthetic League (simulated data)',
  pitch: { lengthM: 105, widthM: 68 },
  status: 'SCHEDULED',
} as const;

export const ID_FORMAT = {
  eventDigits: 6,
  fixture: (scenario: string, seed: number) => `fx_${scenario}_${seed}`,
  team: (slug: string) => `tm_${slug}`,
  player: (teamSlug: string, shirt: number) => `pl_${teamSlug}_${shirt}`,
  event: (sequence: number) =>
    `ev_${String(sequence + 1).padStart(ID_FORMAT.eventDigits, '0')}`,
} as const;

export const TIME = {
  msPerMinute: 60_000,
  periodLengthMs: 45 * 60_000,
  halfTimeBreakMs: 15 * 60_000,
  regulationPeriods: 2,
  stoppageMsRange: {
    1: [60_000, 240_000],
    2: [180_000, 360_000],
  },
} as const;

/** Durations are match-clock milliseconds; tempo divides the hold time. */
export const DURATION = {
  holdMs: [4_300, 10_500],
  pressureMs: [200, 900],
  tackleMs: [300, 1_200],
  passBaseMs: 900,
  passMsPerUnit: 85,
  carryMs: [3_500, 8_500],
  shotToOutcomeMs: [600, 1_400],
  saveToDistributionMs: [3_000, 8_000],
  contestedMs: [800, 2_500],
  outOfPlayMs: [12_000, 32_000],
  foulRestartMs: [20_000, 45_000],
  goalRestartMs: [45_000, 80_000],
  /** Short enough that the goal's cue is still on air when the VOID lands. */
  goalReviewMs: [4_000, 7_000],
  substitutionMs: [20_000, 40_000],
  kickoffMs: [0, 500],
} as const;

export const PITCH = {
  min: 0.5,
  max: 99.5,
  centre: 50,
  finalThirdX: 200 / 3,
  ownThirdX: 100 / 3,
  shotRangeX: 70,
  boxX: 83,
  goalKickX: 6,
  keeperX: 5,
  coordinateDecimals: 1,
} as const;

export const PROBABILITY = {
  pressureBase: 0.07,
  pressurePressingWeight: 0.2,
  pressureOwnThirdHighPress: 0.3,
  tackleGivenPressure: 0.28,
  tacklePressingWeight: 0.18,
  tackleWinBase: 0.5,
  tackleStrengthSwing: 0.35,
  foulGivenChallenge: 0.3,
  yellowGivenFoul: 0.17,
  redGivenFoul: 0.004,
  passSuccessBase: 0.85,
  passStrengthWeight: 0.3,
  passStrengthPivot: 0.5,
  passPressurePenalty: 0.12,
  passDistancePenaltyPerUnit: 0.0035,
  passFinalThirdPenalty: 0.09,
  passFatiguePenalty: 0.03,
  passSuccessMin: 0.3,
  passSuccessMax: 0.97,
  failureIntercepted: 0.5,
  failureLoose: 0.25,
  looseRecoveredByAttacker: 0.45,
  blockedRecoveredByAttacker: 0.4,
  conversionBase: 0.16,
  conversionStrengthWeight: 0.18,
  leftFootShare: 0.3,
  headerShareInBox: 0.18,
} as const;

export const ACTION_WEIGHT = {
  pass: 0.72,
  carryBase: 0.12,
  carryDirectness: 0.22,
  shotInRange: 0.05,
  shotInBox: 0.17,
} as const;

export const SHOT_OUTCOME_WEIGHTS = [
  ['ON_TARGET', 0.36],
  ['OFF_TARGET', 0.36],
  ['BLOCKED', 0.24],
  ['WOODWORK', 0.04],
] as const;

export const SHOT_SPEED_KPH = { min: 55, max: 118 } as const;

/** Fixed wording for scripted VOIDs, so a fixture's hash does not depend on prose drift. */
export const CORRECTION_REASONS = {
  offside: 'Goal ruled out: offside in the build-up',
} as const;

export const MOVEMENT = {
  passBackMax: 14,
  passForwardBase: 8,
  passForwardDirectness: 22,
  passLateralMax: 26,
  carryForward: [3, 13],
  carryLateralMax: 8,
  carryDirectnessFloor: 0.6,
} as const;

export const MODIFIERS = {
  redCardStrengthPenalty: 0.12,
  redCardPressingPenalty: 0.15,
  chasingFromMinute: 60,
  chasingPressingBoost: 0.15,
  chasingDirectnessBoost: 0.2,
  chasingShotBoost: 1.35,
  fatigueFromMinute: 70,
  forcedPassForwardMin: 12,
  forcedPassForwardMax: 24,
} as const;

export const SUBSTITUTIONS = {
  maxPerTeam: 5,
  minPerTeam: 3,
  earliestMinute: 55,
  latestMinute: 86,
  halfTimeShare: 0.2,
} as const;

/** Formation slots in order GK, DF, MF, FW; bench adds one GK and two of each outfield line. */
export const FORMATIONS = {
  '4-3-3': { DF: 4, MF: 3, FW: 3 },
  '4-4-2': { DF: 4, MF: 4, FW: 2 },
  '4-2-3-1': { DF: 4, MF: 5, FW: 1 },
  '3-5-2': { DF: 3, MF: 5, FW: 2 },
} as const;

export const BENCH = { GK: 1, DF: 2, MF: 2, FW: 2 } as const;
export const SHIRT_POOL = { min: 2, max: 40 } as const;

/** Zone weights for who touches the ball: [ownThird, middleThird, finalThird]. */
export const ROLE_ZONE_WEIGHTS = {
  GK: [0.6, 0, 0],
  DF: [3, 1.6, 0.4],
  MF: [1.6, 3, 1.6],
  FW: [0.2, 1.2, 3.2],
} as const;

export const TEAM_COLOURS = [
  { primary: '#1d4ed8', secondary: '#f8fafc' },
  { primary: '#b91c1c', secondary: '#fde68a' },
  { primary: '#047857', secondary: '#f1f5f9' },
  { primary: '#7c3aed', secondary: '#fef3c7' },
  { primary: '#0f172a', secondary: '#facc15' },
  { primary: '#ea580c', secondary: '#1e293b' },
  { primary: '#0e7490', secondary: '#fafaf9' },
  { primary: '#be185d', secondary: '#e2e8f0' },
] as const;

export const HASH = { algorithm: 'sha256', encoding: 'hex' } as const;

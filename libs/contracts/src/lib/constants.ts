export const SCHEMA_VERSION = 1 as const;

export const ID_PREFIX = {
  org: 'org',
  fixture: 'fx',
  team: 'tm',
  player: 'pl',
  event: 'ev',
  insight: 'in',
  narrative: 'nr',
  overlay: 'ov',
  run: 'run',
} as const;

export const ID_BODY_PATTERN = '[A-Za-z0-9][A-Za-z0-9_-]{0,63}';

export const PATTERNS = {
  semVer: /^\d+\.\d+\.\d+$/,
  metricRef: /^[a-zA-Z][a-zA-Z0-9]*(\.[a-zA-Z0-9]+)+$/,
  hexColor: /^#[0-9a-fA-F]{6}$/,
  teamShortName: /^[A-Z]{3}$/,
  formation: /^\d(-\d){2,4}$/,
  reasonCode: /^[A-Z][A-Z0-9_]{2,63}$/,
  sha256Hex: /^[0-9a-f]{64}$/,
  auditAction: /^[a-z][a-z-]*(\.[a-z][a-z-]*)+$/,
} as const;

export const LIMITS = {
  pitchCoordinateMax: 100,
  periodMax: 5,
  shirtNumberMax: 99,
  squadMin: 11,
  squadMax: 26,
  startersPerTeam: 11,
  maxShotSpeedKph: 200,
  maxPlayerSpeedMps: 13,
  /** Local inference (Ollama, ADR-0011 addendum) needs minutes; cloud keeps its short AGENT_TIMEOUT_MS. */
  maxAgentDeadlineMs: 180_000,
  maxAgentRetries: 2,
  maxRepairsPerRun: 16,
  repairDetailMax: 160,
  overlayMinDisplayMs: 2_000,
  overlayMaxDisplayMs: 15_000,
  overlayHeadlineMax: 60,
  overlayBodyMax: 140,
  overlayPriorityMax: 100,
  safeAreaMaxPct: 25,
  narrativeHeadlineMax: 80,
  narrativeBodyMax: 600,
  ingestBatchMax: 500,
  editorialReasonMin: 3,
  editorialReasonMax: 280,
  retractReasonMax: 200,
  auditPageDefault: 50,
  auditPageMax: 200,
  auditCursorMax: 512,
  pageCursorMax: 512,
  auditIdentifierMax: 128,
  faultEveryNthMax: 50,
  faultNoteMax: 300,
} as const;

export const MESSAGES = {
  prefixedId: (prefix: string) => `must match ${prefix}_<id>`,
  metricRef: 'must be a dotted metric path, e.g. shots.home.rolling5m',
  distinctTeams: 'home and away teams must differ',
  duplicatePlayer: 'duplicate playerId',
  duplicateShirt: 'duplicate shirt number within team',
  wrongTeam: (actual: string, expected: string) =>
    `player belongs to ${actual}, not ${expected}`,
  starterCount: (expected: number, actual: number) =>
    `expected ${expected} starters, found ${actual}`,
  windowOrder: 'windowEndMs must not precede windowStartMs',
  overlayOrder: 'clockEndMs must be after clockStartMs',
  overlayTooLong: 'display window exceeds maxDisplayMs',
  auditRange: 'from must not be after to',
  auditTarget: 'targetId requires targetType',
} as const;

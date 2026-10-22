import type {
  Fixture,
  Insight,
  MatchEvent,
  MatchSnapshot,
  MetricValue,
  Narrative,
  OverlayCue,
  Player,
  StreamMessage,
  Team,
  TeamMatchMetrics,
} from '@matchiq/contracts';

export const FX = 'fx_test';
export const HOME = 'tm_home';
export const AWAY = 'tm_away';
const PROVENANCE = {
  kind: 'synthetic',
  generatorVersion: '1.0.0',
  seed: 7,
  scenario: 'unit',
} as const;
const STARTERS = 11;
const SQUAD = 12;

const squad = (teamId: string, prefix: string): Player[] =>
  Array.from({ length: SQUAD }, (_, i) => ({
    playerId: `pl_${prefix}${i + 1}`,
    teamId,
    displayName: `${prefix.toUpperCase()} Player ${i + 1}`,
    shirtNumber: i + 1,
    position: i === 0 ? 'GK' : 'MF',
    starting: i < STARTERS,
    synthetic: true,
  }));

const team = (teamId: string, name: string, shortName: string): Team => ({
  teamId,
  name,
  shortName,
  colors: { primary: '#123456', secondary: '#abcdef' },
  formation: '4-4-2',
  players: squad(teamId, shortName.toLowerCase()),
  synthetic: true,
});

export const fixture = (overrides: Partial<Fixture> = {}): Fixture => ({
  schemaVersion: 1,
  fixtureId: FX,
  title: 'Home United v Away City',
  competitionLabel: 'Synthetic Cup',
  kickoffUtc: '2026-10-24T14:00:00Z',
  status: 'LIVE',
  home: team(HOME, 'Home United', 'HMU'),
  away: team(AWAY, 'Away City', 'AWC'),
  pitch: { lengthM: 105, widthM: 68 },
  provenance: PROVENANCE,
  ...overrides,
});

export const available = (
  value: number,
  unit: 'percent' | 'index' = 'percent',
): MetricValue => ({ status: 'available', value, unit });

export const unavailable: MetricValue = {
  status: 'unavailable',
  reason: 'NO_TRACKING_DATA',
};

const metrics = (
  overrides: Partial<TeamMatchMetrics> = {},
): TeamMatchMetrics => ({
  goals: 1,
  shots: 7,
  shotsOnTarget: 3,
  passesAttempted: 200,
  passesCompleted: 170,
  passCompletionPct: available(85),
  possessionPct: available(55),
  possessionBasis: 'TIME_WEIGHTED',
  pressures: 40,
  recoveries: 20,
  finalThirdEntries: 15,
  fouls: 5,
  yellowCards: 1,
  redCards: 0,
  momentum: available(60, 'index'),
  ...overrides,
});

export const snapshot = (
  overrides: Partial<MatchSnapshot> = {},
): MatchSnapshot => ({
  schemaVersion: 1,
  fixtureId: FX,
  throughSequence: 10,
  algorithmVersion: '1.0.0',
  phase: 'IN_PLAY',
  period: 1,
  matchClockMs: 600_000,
  score: { home: 1, away: 0 },
  home: metrics(),
  away: metrics({
    goals: 0,
    shots: 4,
    possessionPct: available(45),
    momentum: available(40, 'index'),
  }),
  provisional: false,
  stateHash: 'b'.repeat(64),
  ...overrides,
});

export const shot = (
  sequence: number,
  clockMs = sequence * 1_000,
): MatchEvent => ({
  schemaVersion: 1,
  eventId: `ev_${sequence}`,
  fixtureId: FX,
  sequence,
  period: 1,
  matchClockMs: clockMs,
  wallClockUtc: '2026-10-24T14:10:00Z',
  provenance: PROVENANCE,
  type: 'SHOT',
  teamId: HOME,
  playerId: 'pl_hmu9',
  location: { x: 88, y: 50 },
  outcome: 'ON_TARGET',
  bodyPart: 'HEAD',
});

export const insight = (overrides: Partial<Insight> = {}): Insight => ({
  schemaVersion: 1,
  insightId: 'in_1',
  fixtureId: FX,
  kind: 'SHOT_BURST',
  priority: 'P1',
  period: 1,
  matchClockMs: 590_000,
  teamId: HOME,
  reasonCode: 'SHOT_BURST_HOME',
  evidence: {
    insightId: 'in_1',
    fixtureId: FX,
    windowStartMs: 300_000,
    windowEndMs: 590_000,
    eventIds: ['ev_3', 'ev_4'],
    computedMetrics: { 'shots.home.rolling5m': 3 },
    methodVersion: '1.0.0',
    dataCoverage: 0.9,
    confidenceLabel: 'medium',
    rationale: 'Three home shots in five minutes.',
    counterEvidence: [],
    generatedAt: '2026-10-24T14:10:00Z',
  },
  status: 'PUBLISHED',
  synthetic: true,
  ...overrides,
});

export const narrative = (overrides: Partial<Narrative> = {}): Narrative => ({
  schemaVersion: 1,
  narrativeId: 'nr_1',
  fixtureId: FX,
  insightId: 'in_1',
  persona: 'BROADCAST',
  locale: 'en-GB',
  headline: 'Home pile on the pressure',
  body: 'Three shots in five minutes.',
  citations: ['ev_3'],
  source: 'AGENT',
  localeFallback: false,
  createdAt: '2026-10-24T14:10:01Z',
  ...overrides,
});

export const cue = (overrides: Partial<OverlayCue> = {}): OverlayCue => ({
  schemaVersion: 1,
  overlayId: 'ov_1',
  fixtureId: FX,
  revision: 1,
  kind: 'KEY_MOMENT',
  priority: 50,
  persona: 'BROADCAST',
  locale: 'en-GB',
  clockStartMs: 595_000,
  clockEndMs: 605_000,
  maxDisplayMs: 10_000,
  headline: 'Shot burst',
  body: 'Three shots in five minutes.',
  evidenceEventIds: ['ev_3'],
  metricRefs: ['shots.home.rolling5m'],
  safeArea: { topPct: 5, rightPct: 5, bottomPct: 5, leftPct: 5 },
  status: 'LIVE',
  synthetic: true,
  ...overrides,
});

type PayloadOf<T extends StreamMessage['type']> = Extract<
  StreamMessage,
  { type: T }
>['payload'];

export const message = <T extends StreamMessage['type']>(
  type: T,
  payload: PayloadOf<T>,
  streamSequence: number,
): StreamMessage =>
  ({
    schemaVersion: 1,
    streamSequence,
    fixtureId: FX,
    emittedAt: '2026-10-24T14:10:00Z',
    type,
    payload,
  }) as StreamMessage;

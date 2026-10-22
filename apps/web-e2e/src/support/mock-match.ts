import type {
  Insight,
  MatchSnapshot,
  Narrative,
  OverlayCue,
  TeamMatchMetrics,
} from '@matchiq/contracts';
import { FIXTURE_ID, HOME_ID } from './mock-fixture';

export { mockEvents } from './mock-events';

const MINUTE = 60_000;
const SECOND_HALF = 2;
const HASH = 'a'.repeat(64);
export const NOW_MS = 22 * MINUTE + 12_000;

const pct = (value: number) =>
  ({ status: 'available', value, unit: 'percent' }) as const;

const COUNTS = {
  home: {
    goals: 2,
    shots: 14,
    shotsOnTarget: 6,
    passesAttempted: 412,
    passesCompleted: 351,
    pressures: 88,
    recoveries: 47,
    finalThirdEntries: 39,
    fouls: 8,
    yellowCards: 1,
    redCards: 0,
  },
  away: {
    goals: 1,
    shots: 9,
    shotsOnTarget: 4,
    passesAttempted: 356,
    passesCompleted: 287,
    pressures: 101,
    recoveries: 41,
    finalThirdEntries: 27,
    fouls: 11,
    yellowCards: 2,
    redCards: 0,
  },
} as const;

const RATES = {
  home: { passCompletion: 85.2, possession: 54 },
  away: { passCompletion: 80.6, possession: 46 },
} as const;

const metrics = (
  side: 'home' | 'away',
  momentum: number | null,
): TeamMatchMetrics => ({
  ...COUNTS[side],
  passCompletionPct: pct(RATES[side].passCompletion),
  possessionPct: pct(RATES[side].possession),
  possessionBasis: 'TIME_WEIGHTED',
  momentum:
    momentum === null
      ? { status: 'unavailable', reason: 'INSUFFICIENT_SAMPLE' }
      : { status: 'available', value: momentum, unit: 'index' },
});

export const mockSnapshot = (
  clockMs = NOW_MS,
  momentum: [number | null, number | null] = [61.4, 38.6],
  throughSequence = 640,
): MatchSnapshot => ({
  schemaVersion: 1,
  fixtureId: FIXTURE_ID,
  throughSequence,
  algorithmVersion: '1.0.0',
  phase: 'IN_PLAY',
  period: SECOND_HALF,
  matchClockMs: clockMs,
  score: { home: 2, away: 1 },
  home: metrics('home', momentum[0]),
  away: metrics('away', momentum[1]),
  provisional: false,
  stateHash: HASH,
});

export const INSIGHT_ID = 'in_momentum_67';

export const mockInsight = (): Insight => ({
  schemaVersion: 1,
  insightId: INSIGHT_ID,
  fixtureId: FIXTURE_ID,
  kind: 'MOMENTUM_SHIFT',
  priority: 'P1',
  period: SECOND_HALF,
  matchClockMs: 20 * MINUTE + 30_000,
  teamId: HOME_ID,
  reasonCode: 'MOMENTUM_SWING_HOME',
  evidence: {
    insightId: INSIGHT_ID,
    fixtureId: FIXTURE_ID,
    windowStartMs: 14 * MINUTE,
    windowEndMs: 20 * MINUTE + 30_000,
    eventIds: ['ev_601', 'ev_604', 'ev_607', 'ev_625', 'ev_626'],
    computedMetrics: {
      'recoveries.home.rolling6m': 5,
      'shots.home.rolling6m': 3,
      'momentum.home.delta': 18.2,
    },
    methodVersion: '1.0.0',
    dataCoverage: 0.94,
    confidenceLabel: 'high',
    rationale:
      'Five high regains in six minutes preceded three home shots and the equaliser.',
    counterEvidence: [
      {
        description: 'Away side retained 46% possession across the window.',
        eventIds: [],
      },
    ],
    generatedAt: '2026-10-24T15:07:10Z',
  },
  status: 'PUBLISHED',
  synthetic: true,
});

const narrative = (
  persona: Narrative['persona'],
  locale: Narrative['locale'],
  headline: string,
  body: string,
): Narrative => ({
  schemaVersion: 1,
  narrativeId: `nr_${persona.toLowerCase()}_${locale.replace('-', '').toLowerCase()}`,
  fixtureId: FIXTURE_ID,
  insightId: INSIGHT_ID,
  persona,
  locale,
  headline,
  body,
  citations: ['ev_601', 'ev_626'],
  source: 'TEMPLATE',
  localeFallback: false,
  createdAt: '2026-10-24T15:07:11Z',
});

export const NARRATIVES = {
  broadcastEn: narrative(
    'BROADCAST',
    'en-GB',
    'Northbridge seize control',
    'Five regains in six minutes led to three shots and the equaliser.',
  ),
  broadcastFr: narrative(
    'BROADCAST',
    'fr-FR',
    'Northbridge prend le contrôle',
    'Cinq récupérations en six minutes ont mené à trois tirs et à l’égalisation.',
  ),
  broadcastPcm: narrative(
    'BROADCAST',
    'pcm-NG',
    'Northbridge don take control',
    'Dem collect ball five times for six minutes, shoot three times, and equalise.',
  ),
  casualEn: narrative(
    'CASUAL',
    'en-GB',
    'Northbridge are on top now',
    'They keep winning the ball back high up the pitch, and it just paid off with a goal.',
  ),
  analystEn: narrative(
    'ANALYST',
    'en-GB',
    'High regains drive home momentum swing',
    'Recoveries in the attacking half rose to five in a six-minute window, converting into three shots (two on target).',
  ),
} as const;

export const OVERLAY_ID = 'ov_momentum_67';

export const mockCue = (revision = 1): OverlayCue => ({
  schemaVersion: 1,
  overlayId: OVERLAY_ID,
  fixtureId: FIXTURE_ID,
  insightId: INSIGHT_ID,
  revision,
  kind: 'TACTICAL_INSIGHT',
  priority: 70,
  persona: 'BROADCAST',
  locale: 'en-GB',
  clockStartMs: NOW_MS - 2_000,
  clockEndMs: NOW_MS + 8_000,
  maxDisplayMs: 12_000,
  headline: 'Pressure building on the left',
  body: 'Five recoveries in the last six minutes led to three shots.',
  evidenceEventIds: ['ev_601', 'ev_604', 'ev_607'],
  metricRefs: ['recoveries.home.rolling6m', 'shots.home.rolling6m'],
  safeArea: { topPct: 5, rightPct: 5, bottomPct: 6, leftPct: 5 },
  status: 'LIVE',
  synthetic: true,
});

export const MOMENTUM_SERIES: [number | null, number | null][] = [
  [null, null],
  [44.1, 55.9],
  [46.3, 53.7],
  [43.8, 56.2],
  [48.9, 51.1],
  [52.6, 47.4],
  [55.1, 44.9],
  [57.8, 42.2],
  [60.2, 39.8],
  [61.4, 38.6],
];

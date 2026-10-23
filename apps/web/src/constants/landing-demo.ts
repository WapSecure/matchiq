import type { OverlayCue } from '@matchiq/contracts';
import { toScreen, type PitchMark } from '@/components/charts/pitch-events';
import type { PitchKind } from '@/constants/pitch';

/**
 * Static sample for the landing-page product shot. It is rendered with the
 * real studio components; the teams are the seeded synthetic comeback fixture.
 */
export const DEMO = {
  chrome: 'Live studio',
  live: 'Live',
  title: 'Penbrook Town v Marshstead Albion',
  home: { name: 'Penbrook Town', shortName: 'PEN' },
  away: { name: 'Marshstead Albion', shortName: 'MAR' },
  score: { home: 2, away: 2 },
  period: 2,
  clockMs: 33 * 60_000 + 41_000,
  clock: '78:41',
  insight: {
    kind: 'Momentum shift',
    priority: 'Notable',
    headline: 'Penbrook turn the screw',
    body: 'Six regains in the final third in eight minutes, three shots and the equaliser.',
    evidence: '7 plays · 3 stats · strong evidence',
  },
  label:
    'Product preview: the live studio with the scoreboard, an on-air graphic, the pitch map and a key moment with its evidence, drawn with the app’s own components and simulated data.',
} as const;

export const DEMO_CUE: OverlayCue = {
  schemaVersion: 1,
  overlayId: 'ov_demo',
  fixtureId: 'fx_demo',
  insightId: 'in_demo',
  revision: 2,
  kind: 'KEY_MOMENT',
  priority: 80,
  persona: 'BROADCAST',
  locale: 'en-GB',
  clockStartMs: 0,
  clockEndMs: 1,
  maxDisplayMs: 12_000,
  headline: 'Penbrook level it late',
  body: 'Six high regains in eight minutes, then the equaliser from close range.',
  evidenceEventIds: ['ev_demo'],
  metricRefs: ['recoveries.home.rolling8m'],
  safeArea: { topPct: 5, rightPct: 5, bottomPct: 6, leftPct: 5 },
  status: 'LIVE',
  synthetic: true,
};

type DemoPoint = [PitchKind, 'home' | 'away', number, number, boolean?];

const POINTS: DemoPoint[] = [
  ['RECOVERY', 'home', 64, 38],
  ['RECOVERY', 'home', 71, 61],
  ['RECOVERY', 'home', 58, 52],
  ['RECOVERY', 'away', 55, 44],
  ['FINAL_THIRD_ENTRY', 'home', 69, 30],
  ['FINAL_THIRD_ENTRY', 'home', 67, 70],
  ['FINAL_THIRD_ENTRY', 'away', 68, 55],
  ['SHOT', 'home', 84, 44, true],
  ['SHOT', 'home', 79, 62, false],
  ['SHOT', 'away', 82, 47, false],
  ['SHOT', 'away', 88, 40, true],
  ['GOAL', 'home', 90, 51],
  ['GOAL', 'away', 91, 46],
];

export const DEMO_MARKS: PitchMark[] = POINTS.map(
  ([kind, side, x, y, onTarget], i) => ({
    id: `demo-${i}`,
    kind,
    side,
    teamShort: DEMO[side].shortName,
    minute: '',
    player: null,
    source: { x, y },
    ...toScreen({ x, y }, side),
    onTarget: kind === 'SHOT' ? (onTarget ?? true) : null,
    outcome: null,
  }),
);

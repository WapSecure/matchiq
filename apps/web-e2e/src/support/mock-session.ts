import type { AgentRun, ReplayStatus } from '@matchiq/contracts';
import { AWAY_ID, FIXTURE_ID, HOME_ID, TEMPLATE_ID } from './mock-fixture';
import { INSIGHT_ID, mockSnapshot, NARRATIVES, NOW_MS } from './mock-match';

const MINUTE = 60_000;
const EVENT_COUNT = 1_470;

const team = (side: 'home' | 'away') => ({
  teamId: side === 'home' ? HOME_ID : AWAY_ID,
  name: side === 'home' ? 'Northbridge Athletic' : 'Harbourside Rovers',
  shortName: side === 'home' ? 'NBA' : 'HSR',
  colors:
    side === 'home'
      ? { primary: '#1d4ed8', secondary: '#ffffff' }
      : { primary: '#d97706', secondary: '#111827' },
});

export const mockTemplates = () => [
  {
    templateId: 'fx_high-press_42',
    title: 'Kingsford Albion vs Northport Albion',
    competitionLabel: 'MatchIQ Synthetic League (simulated data)',
    scenario: 'high-press',
    seed: 42,
    eventCount: 1_361,
    eventsHash: 'b'.repeat(64),
    finalScore: { home: 0, away: 0 },
    home: { ...team('home'), name: 'Kingsford Albion', shortName: 'KIN' },
    away: { ...team('away'), name: 'Northport Albion', shortName: 'NOR' },
  },
  {
    templateId: TEMPLATE_ID,
    title: 'Northbridge Athletic vs Harbourside Rovers',
    competitionLabel: 'MatchIQ Synthetic League (simulated data)',
    scenario: 'comeback',
    seed: 4207,
    eventCount: EVENT_COUNT,
    eventsHash: 'a'.repeat(64),
    finalScore: { home: 2, away: 1 },
    home: team('home'),
    away: team('away'),
  },
];

export const mockStatus = (
  overrides: Partial<ReplayStatus> = {},
): ReplayStatus => ({
  fixtureId: FIXTURE_ID,
  state: 'PLAYING',
  speed: 20,
  appliedSequence: 640,
  period: 2,
  matchClockMs: NOW_MS,
  ...overrides,
});

export const mockSessions = () => [
  {
    sessionId: FIXTURE_ID,
    templateId: TEMPLATE_ID,
    sessionNumber: 1,
    title: 'Northbridge Athletic vs Harbourside Rovers',
    status: mockStatus(),
    createdAt: '2026-10-24T15:00:00Z',
    updatedAt: '2026-10-24T15:07:12Z',
  },
];

const narrativesOf = () =>
  Object.values(NARRATIVES).map((n) => ({
    persona: n.persona,
    locale: n.locale,
    headline: n.headline,
    body: n.body,
    source: n.source,
    citations: n.citations,
  }));

export const mockRecap = () => ({
  schemaVersion: 1,
  fixtureId: FIXTURE_ID,
  title: 'Northbridge Athletic vs Harbourside Rovers',
  finalSnapshot: {
    ...mockSnapshot(47 * MINUTE, [52.1, 47.9], EVENT_COUNT - 1),
    phase: 'COMPLETED',
  },
  keyMoments: [
    {
      insightId: INSIGHT_ID,
      kind: 'MOMENTUM_SHIFT',
      priority: 'P1',
      period: 2,
      matchClockMs: 20 * MINUTE + 30_000,
      teamId: HOME_ID,
      reasonCode: 'MOMENTUM_SWING_HOME',
      confidenceLabel: 'high',
      evidenceEventIds: ['ev_601', 'ev_604', 'ev_607', 'ev_625', 'ev_626'],
      metricRefs: ['recoveries.home.rolling6m', 'shots.home.rolling6m'],
      narratives: narrativesOf(),
    },
  ],
  synthetic: true,
});

const run = (overrides: Partial<AgentRun>): AgentRun => ({
  runId: 'run_template_1',
  correlationId: '29f9b4b3-d721-8eb6-9911-25ef49b3355c',
  agent: 'NARRATIVE_WRITER',
  provider: 'template',
  promptVersion: '1.0.0',
  startedAt: '2026-10-24T15:07:10Z',
  latencyMs: 0,
  retries: 0,
  outcome: 'FALLBACK',
  ...overrides,
});

export const mockTraces = () => [
  {
    insightId: INSIGHT_ID,
    kind: 'MOMENTUM_SHIFT',
    matchClockMs: 20 * MINUTE + 30_000,
    status: 'FALLBACK',
    publication: 'TEMPLATE',
    fallbackReason: 'AI_ENABLED=false: deterministic templates only',
    gate: {
      source: 'TEMPLATE',
      publishedNarratives: 9,
      templateNarratives: 9,
      overlayRevision: null,
      rejected: [],
    },
    runs: [run({})],
  },
  {
    insightId: 'in_goal_71',
    kind: 'GOAL',
    matchClockMs: 26 * MINUTE,
    status: 'PUBLISHED',
    publication: 'AGENT',
    fallbackReason: null,
    gate: {
      source: 'AGENT',
      publishedNarratives: 8,
      templateNarratives: 1,
      overlayRevision: 2,
      rejected: [
        {
          item: 'NARRATIVE',
          source: 'AGENT',
          persona: 'CASUAL',
          locale: 'fr-FR',
          codes: ['UNSUPPORTED_NUMBER'],
          details: ['"3" is not a cited value'],
        },
      ],
    },
    runs: [
      run({
        runId: 'run_mock_1',
        provider: 'mock',
        outcome: 'SUCCEEDED',
        latencyMs: 412,
      }),
      run({
        runId: 'run_mock_2',
        agent: 'FACT_CHECKER',
        provider: 'mock',
        outcome: 'SUCCEEDED',
        latencyMs: 96,
        startedAt: '2026-10-24T15:07:11Z',
      }),
    ],
  },
];

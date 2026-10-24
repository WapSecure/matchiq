import type {
  AgentRun,
  AnalystBreakdown,
  BreakdownPart,
  MatchStory,
  ReplayStatus,
} from '@matchiq/contracts';
import type {
  FixtureTemplateSummary,
  RecapDocument,
  RecapMoment,
  ReplaySessionView,
} from '@/lib/api/session-schemas';
import type { InsightTrace } from '@/lib/api/trace-schemas';
import { AWAY, FX, HOME, snapshot } from './factories';

export const TEMPLATE = 'fx_test';
export const SESSION = `${TEMPLATE}_s1`;

export const template = (
  overrides: Partial<FixtureTemplateSummary> = {},
): FixtureTemplateSummary => ({
  templateId: TEMPLATE,
  title: 'Home United vs Away City',
  competitionLabel: 'Synthetic League',
  scenario: 'comeback',
  seed: 42,
  eventCount: 1_470,
  eventsHash: 'a'.repeat(64),
  finalScore: { home: 3, away: 2 },
  home: {
    teamId: HOME,
    name: 'Home United',
    shortName: 'HMU',
    colors: { primary: '#123456', secondary: '#abcdef' },
  },
  away: {
    teamId: AWAY,
    name: 'Away City',
    shortName: 'AWC',
    colors: { primary: '#654321', secondary: '#fedcba' },
  },
  ...overrides,
});

export const status = (
  overrides: Partial<ReplayStatus> = {},
): ReplayStatus => ({
  fixtureId: FX,
  state: 'PLAYING',
  speed: 20,
  appliedSequence: 10,
  period: 1,
  matchClockMs: 600_000,
  ...overrides,
});

export const sessionView = (
  overrides: Partial<ReplaySessionView> = {},
): ReplaySessionView => ({
  sessionId: SESSION,
  templateId: TEMPLATE,
  sessionNumber: 1,
  title: 'Home United vs Away City',
  status: status({ fixtureId: SESSION }),
  createdAt: '2026-10-21T17:18:51.481Z',
  updatedAt: '2026-10-21T17:21:51.268Z',
  ...overrides,
});

export const run = (overrides: Partial<AgentRun> = {}): AgentRun => ({
  runId: 'run_1',
  correlationId: '29f9b4b3-d721-8eb6-9911-25ef49b3355c',
  agent: 'NARRATIVE_WRITER',
  provider: 'template',
  promptVersion: '1.0.0',
  startedAt: '2026-10-21T17:19:26.747Z',
  latencyMs: 0,
  retries: 0,
  outcome: 'FALLBACK',
  ...overrides,
});

export const trace = (overrides: Partial<InsightTrace> = {}): InsightTrace => ({
  insightId: 'in_1',
  kind: 'SHOT_BURST',
  matchClockMs: 590_000,
  status: 'FALLBACK',
  publication: 'TEMPLATE',
  fallbackReason: 'AI_ENABLED=false: deterministic templates only',
  gate: {
    source: 'TEMPLATE',
    publishedNarratives: 12,
    templateNarratives: 12,
    overlayRevision: null,
    rejected: [],
  },
  runs: [run()],
  ...overrides,
});

export const moment = (overrides: Partial<RecapMoment> = {}): RecapMoment => ({
  insightId: 'in_1',
  kind: 'GOAL',
  priority: 'P0',
  period: 2,
  matchClockMs: 1_800_000,
  teamId: HOME,
  reasonCode: 'GOAL_HOME',
  confidenceLabel: 'high',
  evidenceEventIds: ['ev_3', 'ev_4'],
  metricRefs: ['shots.home.rolling5m'],
  narratives: [
    {
      persona: 'BROADCAST',
      locale: 'en-GB',
      headline: 'Home United level it',
      body: 'A header from the corner.',
      source: 'TEMPLATE',
      localeFallback: false,
      citations: ['ev_3'],
    },
    {
      persona: 'BROADCAST',
      locale: 'fr-FR',
      headline: 'Home United égalise',
      body: 'Une tête sur corner.',
      source: 'TEMPLATE',
      localeFallback: false,
      citations: ['ev_3'],
    },
  ],
  ...overrides,
});

export const recap = (
  overrides: Partial<RecapDocument> = {},
): RecapDocument => ({
  schemaVersion: 1,
  fixtureId: FX,
  title: 'Home United vs Away City',
  finalSnapshot: snapshot({
    phase: 'COMPLETED',
    period: 2,
    score: { home: 3, away: 2 },
  }),
  keyMoments: [moment()],
  synthetic: true,
  ...overrides,
});

const part = (text: string): BreakdownPart => ({
  text,
  citedValues: [{ metricRef: 'shots.home.rolling5m', value: 4 }],
  evidenceEventIds: ['ev_3'],
});

export const breakdown = (
  overrides: Partial<AnalystBreakdown> = {},
): AnalystBreakdown => ({
  whatHappened: part('Home United scored from a corner.'),
  whyItMatters: part('It levels the match after a spell of pressure.'),
  whatToWatch: part('Whether Away City can clear the next set piece.'),
  ...overrides,
});

export const story = (overrides: Partial<MatchStory> = {}): MatchStory => ({
  persona: 'BROADCAST',
  locale: 'en-GB',
  paragraphs: [
    {
      kind: 'FIRST_HALF',
      text: 'Away City led at the break.',
      citedValues: [],
      eventIds: ['ev_1'],
      insightIds: [],
    },
    {
      kind: 'FULL_TIME',
      text: 'Home United came back to win 3–2.',
      citedValues: [],
      eventIds: ['ev_4'],
      insightIds: ['in_1'],
    },
  ],
  ...overrides,
});

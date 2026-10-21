import type { ConnectionState } from '@/lib/stream';

export const WATERMARK = 'Synthetic match demo';

export const STUDIO_COPY = {
  metaTitle: 'Live Studio',
  backToLobby: 'Fixtures',
  title: 'Live Studio',
  scoreboardLabel: 'Scoreboard',
  awaitingSnapshot: 'Awaiting first match snapshot',
  provisional: 'Provisional',
  provisionalHint: 'State is being reconciled after a gap or correction',
  algorithm: (version: string) => `Engine v${version}`,
  timeline: {
    title: 'Event timeline',
    description: 'Key events in match order',
    empty: 'No events yet. Start the replay to begin the feed.',
    count: (n: number) => `${n} events`,
    voided: 'Voided',
  },
  insights: {
    title: 'AI insight feed',
    description: 'Detected by the deterministic engine, explained by agents',
    empty: 'No key moments detected yet.',
    evidence: 'Evidence',
    coverage: 'Data coverage',
    openEvidence: (headline: string) => `Open evidence for ${headline}`,
    narrativePending: 'Narrative pending — showing verified facts only.',
    localeFallback: (locale: string) =>
      `${locale} variant unavailable; showing en-GB.`,
    source: { AGENT: 'Agent narrative', TEMPLATE: 'Deterministic template' },
  },
  metrics: {
    title: 'Live metrics',
    possession: 'Possession',
    comparison: 'Team comparison',
    passCompletion: 'Pass completion',
    momentum: 'Momentum',
    momentumDescription: 'Engine momentum index per team over match time',
    momentumEmpty: 'Momentum appears once the engine publishes snapshots.',
    tableToggle: 'View as table',
    lineStyle: { home: 'solid', away: 'dashed' },
    clock: 'Match time',
  },
  overlay: {
    title: 'Broadcast overlay preview',
    description: '16:9 graphics-safe frame at the current match clock',
    empty: 'No approved cue on air',
    safeArea: 'Safe area',
    cueLog: 'Retractions',
    retracted: 'Retracted',
    frameLabel: (count: number) =>
      count === 0
        ? 'Overlay preview, no cue on air'
        : `Overlay preview, ${count} cue${count === 1 ? '' : 's'} on air`,
  },
  controls: {
    persona: 'Audience',
    locale: 'Language',
  },
  connectionPrefix: 'Stream ',
  notFound: 'Fixture not found',
  loadError: 'The studio could not load this fixture',
} as const;

export const CONNECTION_COPY: Record<
  ConnectionState,
  { label: string; banner: string | null }
> = {
  connecting: { label: 'Connecting', banner: null },
  live: { label: 'Live', banner: null },
  reconnecting: {
    label: 'Reconnecting',
    banner:
      'Stream interrupted. Reconnecting and resuming from the last event.',
  },
  stale: {
    label: 'Stale',
    banner: 'No data received recently. Figures may be out of date.',
  },
  offline: {
    label: 'Offline',
    banner: 'You are offline. Showing the last known match state.',
  },
};

export const STAT_ROWS = [
  { key: 'shots', label: 'Shots' },
  { key: 'shotsOnTarget', label: 'On target' },
  { key: 'passesCompleted', label: 'Passes completed' },
  { key: 'pressures', label: 'Pressures' },
  { key: 'recoveries', label: 'Recoveries' },
  { key: 'finalThirdEntries', label: 'Final-third entries' },
  { key: 'fouls', label: 'Fouls' },
  { key: 'yellowCards', label: 'Yellow cards' },
] as const;

export const ANNOUNCE_THROTTLE_MS = 5_000;

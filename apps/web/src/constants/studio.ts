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
    period: (n: number) => `Period ${n}`,
  },
  insights: {
    title: 'Match insights',
    description: 'Key moments with supporting match evidence',
    empty: 'No key moments detected yet.',
    evidence: 'Evidence',
    coverage: 'Data coverage',
    openEvidence: (headline: string) => `Open evidence for ${headline}`,
    narrativePending: 'Commentary is pending. Showing verified facts.',
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
    awaiting:
      'Live metrics appear once the engine publishes the first match snapshot.',
    momentumEmpty: 'Momentum appears once the engine publishes snapshots.',
    tableToggle: 'View as table',
    lineStyle: { home: 'solid', away: 'dashed' },
    clock: 'Match time',
  },
  overlay: {
    title: 'Broadcast overlay preview',
    description:
      '16:9 preview with graphics safe areas at the current match time',
    safeArea: 'Safe area',
    frameLabel: (count: number) =>
      count === 0
        ? 'Overlay preview, standing by'
        : `Overlay preview, ${count} cue${count === 1 ? '' : 's'} on air`,
  },
  controls: {
    persona: 'Audience',
    locale: 'Language',
    invariant:
      'Language changes commentary, not the controls. Audience changes its style. Both preserve the match facts.',
  },
  connectionPrefix: 'Connection: ',
  notFound: "We couldn't find this match",
  loadError: "We couldn't open this match",
} as const;

export const CONNECTION_COPY: Record<
  ConnectionState,
  { label: string; banner: string | null }
> = {
  connecting: { label: 'Connecting…', banner: null },
  live: { label: 'Live', banner: null },
  reconnecting: {
    label: 'Reconnecting…',
    banner: 'Reconnecting… The score and stats will catch up by themselves.',
  },
  stale: {
    label: 'Catching up',
    banner:
      'Updates are slow to arrive, so figures may be a few seconds behind. No action needed.',
  },
  offline: {
    label: 'Offline',
    banner:
      "You're offline. Showing the last known score and stats. We'll pick up again when you're back.",
  },
};

export const STAT_ROWS = [
  { key: 'shots', label: 'Shots' },
  { key: 'shotsOnTarget', label: 'On target' },
  { key: 'passesCompleted', label: 'Passes completed' },
  { key: 'pressures', label: 'Pressures' },
  { key: 'recoveries', label: 'Recoveries' },
  { key: 'finalThirdEntries', label: 'Final third entries' },
  { key: 'fouls', label: 'Fouls' },
  { key: 'yellowCards', label: 'Yellow cards' },
] as const;

export const ANNOUNCE_THROTTLE_MS = 5_000;

/** A keyboard seek is sent once the slider has been still this long. */
export const SEEK_COMMIT_IDLE_MS = 600;

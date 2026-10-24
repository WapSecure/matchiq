import type { ConnectionState } from '@/lib/stream';

export const WATERMARK = 'Simulated match';

export const STUDIO_COPY = {
  metaTitle: 'Live studio',
  backToLobby: 'Matches',
  title: 'Live studio',
  scoreboardLabel: 'Scoreboard',
  awaitingSnapshot: 'Waiting for kick-off',
  provisional: 'Updating',
  provisionalHint:
    'Catching up after a short gap. Figures will settle in a moment.',
  timeline: {
    title: 'Match events',
    description: 'Goals, cards, shots and changes',
    descriptionAll: 'Every play as it happens',
    showAll: 'Show all events',
    moreLabel: 'More match events',
    noun: { one: 'event', other: 'events' },
    pageSize: 25,
    loadFailed: "We couldn't load earlier events.",
    empty: 'No events yet. Start the replay to begin.',
    emptyKey:
      'No goals, cards or shots yet. Switch on "Show all events" to see every play.',
    count: (n: number) => `${n} events`,
    voided: 'Corrected',
    period: (n: number) => `Period ${n}`,
  },
  insights: {
    moreLabel: 'More key moments',
    title: 'Key moments',
    description: 'Spotted in the match data, written up and fact-checked',
    empty: 'No key moments yet. They appear here as the match unfolds.',
    evidence: 'Evidence',
    coverage: 'Data completeness',
    openEvidence: (headline: string) => `See the evidence for ${headline}`,
    narrativePending: 'Write-up on its way.',
    narrativePendingAnalyst: 'Write-up on its way. Here are the facts so far.',
    localeFallback: (language: string) =>
      `The ${language} version isn't ready yet, so you're seeing English.`,
    source: {
      AGENT: 'Fact-checked',
      TEMPLATE: 'Standard wording',
    },
    sourceHint: {
      AGENT:
        'Auto-written from the match data. Every number was checked before it went out.',
      TEMPLATE:
        "Pre-written sentences filled in with match data. Used when the auto-written version isn't ready or didn't pass the fact check.",
    },
  },
  metrics: {
    title: 'Match stats',
    description: 'Every number comes from the match data',
    possession: 'Possession',
    comparison: 'Team comparison',
    passCompletion: 'Pass completion',
    momentum: 'Momentum',
    momentumDescription:
      'Who is on top, from shots, final third entries, pressing and high ball wins, compared with the rest of the match',
    awaiting: 'Stats appear once play begins.',
    momentumEmpty: 'Momentum appears a few minutes into the match.',
    tableToggle: 'View as table',
    lineStyle: { home: 'solid line', away: 'dashed line' },
    momentumLead: (team: string) => `${team} on top`,
    momentumLevel: 'Evenly balanced',
    /** Index points between the sides that still read as level. */
    momentumLevelMargin: 5,
    clock: 'Match time',
  },
  overlay: {
    title: 'On-air preview',
    description: 'What viewers see right now',
    safeArea: 'Safe area',
    frameLabel: (count: number) =>
      count === 0
        ? 'On-air preview, standing by'
        : `On-air preview, ${count} graphic${count === 1 ? '' : 's'} on air`,
  },
  controls: {
    persona: 'Audience',
    locale: 'Language',
    invariant:
      'Changes the wording of key moments and graphics. The numbers never change.',
  },
  fullTime: {
    title: 'Full time',
    body: 'The recap is ready: the result, the key moments and a match report to download.',
    action: 'See the recap',
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

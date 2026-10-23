export const LOBBY_COPY = {
  metaTitle: 'Fixture Lobby',
  eyebrow: 'Fixture lobby',
  title: 'Choose a synthetic fixture',
  description:
    'Explore fictional matches in the studio. Start a replay, inspect the evidence and share the session link with your team.',
  listLabel: 'Synthetic fixtures',
  scenario: 'Scenario',
  events: 'Events',
  start: 'Start replay',
  startLabel: (title: string) => `Start replay of ${title}`,
  starting: 'Starting…',
  speedLabel: 'Replay speed',
  speedFor: (title: string) => `Replay speed for ${title}`,
  startFailed: "We couldn't start the replay.",
  rateLimited:
    "You've started a lot of replays in a short time. Wait a minute, or join one of the recent replays below.",
  empty: {
    title: 'No matches to replay yet',
    description:
      'Matches appear here as soon as they are ready. Check back in a moment.',
  },
  error: { title: "We couldn't load the matches" },
  loading: 'Loading fixtures',
  sessions: {
    title: 'Recent sessions',
    description: 'Join a replay already in progress or review a finished one',
    listLabel: 'Recent replay sessions',
    empty: 'No sessions yet. Start a replay above.',
    error: "We couldn't load recent replays",
    loading: 'Loading recent sessions',
    open: 'Open',
    openLabel: (title: string, n: number) => `Open replay ${n} of ${title}`,
    notStarted: 'Not started',
  },
} as const;

/** Display names for generator scenarios; unknown ones are title-cased. */
export const SCENARIO_LABELS: Record<string, string> = {
  comeback: 'Late comeback',
  'high-press': 'High press',
  'low-event': 'Quiet match',
  'possession-dominance': 'Possession dominance',
  'red-card-swing': 'Red card turning point',
};

export const SCENARIO_WORD_SEPARATOR = /[-_]+/g;

/** The judge quick-start (spec §19) begins with this scenario. */
export const FEATURED_SCENARIO = 'comeback';
export const FEATURED_LABEL = 'Recommended replay';

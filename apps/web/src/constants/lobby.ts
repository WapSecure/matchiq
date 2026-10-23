export const LOBBY_COPY = {
  metaTitle: 'Fixture Lobby',
  eyebrow: 'Fixture lobby',
  title: 'Choose a synthetic fixture',
  description:
    'Explore fictional matches in the studio. Start a replay, inspect the evidence and share the session link with your team.',
  listLabel: 'Synthetic fixtures',
  scenario: 'Scenario',
  seedLabel: 'Seed',
  events: 'Events',
  hash: 'Events hash',
  start: 'Start replay',
  startLabel: (title: string) => `Start replay of ${title}`,
  starting: 'Starting…',
  speedLabel: 'Replay speed',
  speedFor: (title: string) => `Replay speed for ${title}`,
  startFailed: 'Replay could not be started',
  rateLimited:
    'Too many replay starts from this browser. Wait a minute, or join a recent session below.',
  empty: {
    title: 'No fixtures available',
    description:
      'No demo fixtures are available right now. Try again later or contact your workspace administrator.',
  },
  error: { title: 'Fixtures could not be loaded' },
  loading: 'Loading fixtures',
  sessions: {
    title: 'Recent sessions',
    description: 'Join a replay already in progress or review a finished one',
    listLabel: 'Recent replay sessions',
    empty: 'No sessions yet. Start a replay above.',
    error: 'Recent sessions could not be loaded',
    loading: 'Loading recent sessions',
    open: 'Open',
    openLabel: (title: string, n: number) => `Open session ${n} of ${title}`,
    number: (n: number) => `Session ${n}`,
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

export const HASH_PREVIEW_CHARS = 10;

export const LOBBY_COPY = {
  metaTitle: 'Matches',
  eyebrow: 'Matches',
  title: 'Choose a match to replay',
  description:
    'Every match is fictional and plays out exactly the same way each time, so you can rehearse and compare. Anyone with the link to a replay sees the same thing at the same moment.',
  listLabel: 'Matches',
  scenario: 'Storyline',
  events: 'Match events',
  seedLabel: 'Seed',
  hash: 'Events hash',
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
  loading: 'Loading matches',
  sessions: {
    title: 'Recent replays',
    description: 'Join a replay in progress or look back at a finished one',
    listLabel: 'Recent replays',
    empty: 'No replays yet. Start one above.',
    error: "We couldn't load recent replays",
    loading: 'Loading recent replays',
    open: 'Open',
    openLabel: (title: string, n: number) => `Open replay ${n} of ${title}`,
    number: (n: number) => `Replay ${n}`,
    notStarted: 'Not started',
  },
} as const;

/** Display names for generator scenarios; unknown ones are title-cased. */
export const SCENARIO_LABELS: Record<string, string> = {
  comeback: 'Late comeback',
  'high-press': 'High press',
  'low-event': 'Low-event grind',
  'possession-dominance': 'Possession dominance',
  'red-card-swing': 'Red-card swing',
};

export const SCENARIO_WORD_SEPARATOR = /[-_]+/g;

/** The judge quick-start (spec §19) begins with this scenario. */
export const FEATURED_SCENARIO = 'comeback';
export const FEATURED_LABEL = 'Judge quick-start';

export const HASH_PREVIEW_CHARS = 10;

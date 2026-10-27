import type { ReplayState } from '@matchiq/contracts';

export const LOBBY_COPY = {
  metaTitle: 'Matches',
  eyebrow: 'Matches',
  title: 'Choose a match to replay',
  description:
    'Pick a match and a speed. Key moments, stats and broadcast graphics build as it plays.',
  howItWorks: {
    label: 'How replays work',
    text: 'Each match plays out the same way every time, so you can rehearse and compare. Anyone with the link to a replay sees the same moment you do.',
  },
  listLabel: 'Matches',
  pagesLabel: 'Match pages',
  scenario: 'Storyline',
  events: 'Match events',
  versus: 'vs',
  expect: 'What to expect',
  demoFaultInfo: 'About demo failures',
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
    pagesLabel: 'Recent replay pages',
    empty: 'No replays yet. Start one above.',
    error: "We couldn't load recent replays",
    loading: 'Loading recent replays',
    open: 'Open',
    openLabel: (title: string, n: number) => `Open replay ${n} of ${title}`,
    notStarted: 'Not started',
    live: 'Live now',
    finished: 'Finished',
    state: {
      IDLE: 'Ready',
      PLAYING: 'Live',
      PAUSED: 'Paused',
      COMPLETED: 'Full time',
    } satisfies Record<ReplayState, string>,
  },
} as const;

/** Display names for generator scenarios; unknown ones are title-cased. */
export const SCENARIO_LABELS: Record<string, string> = {
  comeback: 'Late comeback',
  'disallowed-goal': 'Disallowed goal',
  'high-press': 'High press',
  'low-event': 'Quiet match',
  'possession-dominance': 'Possession dominance',
  'red-card-swing': 'Red card turning point',
};

/** One spoiler-free line per storyline; unknown storylines show none. */
export const SCENARIO_PREVIEWS: Record<string, string> = {
  comeback:
    'The visitors build a lead before the break. Watch for a late turnaround.',
  'disallowed-goal':
    'A goal is chalked off after it goes in. Watch it come off the screen.',
  'high-press':
    'Both sides press hard. Expect tackles, turnovers and quick breaks.',
  'low-event':
    'A cagey, slow match with few shots. Useful for quiet spells on air.',
  'possession-dominance':
    'One side keeps the ball and the territory. Watch the pressure build.',
  'red-card-swing': 'A sending-off changes the game. Watch the momentum shift.',
};

/** The global notice already discloses simulated data, so cards drop the suffix. */
export const COMPETITION_SUFFIX = /\s*\(simulated data\)\s*$/i;

export const SCENARIO_WORD_SEPARATOR = /[-_]+/g;

/** The judge quick-start (spec §19) begins with this scenario. */
export const FEATURED_SCENARIO = 'comeback';
export const FEATURED_LABEL = 'Recommended replay';

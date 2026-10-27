import { ROUTES } from './navigation';

export type GuideStep = {
  key: string;
  title: string;
  doThis: string;
  shows: string;
  link?: { label: string; href: string };
};

export const GUIDE_COPY = {
  metaTitle: 'A three-minute tour',
  eyebrow: 'For judges',
  title: 'A three-minute tour',
  description:
    'Eight short steps that show the best of MatchIQ. Every match here is simulated, and nothing needs setting up first.',
  stepsLabel: 'Tour steps',
  doLabel: 'Do this',
  showsLabel: 'What it shows',
  wording:
    'Commentary is written by a model when one is available or replayed from a recording. Otherwise standard wording is used, and either way a fact check confirms every number first.',
  closing: {
    title: 'Ready to try it?',
    action: 'Choose a match',
  },
} as const;

const lobby = { label: 'Open the matches', href: ROUTES.fixtures };

export const GUIDE_STEPS: readonly GuideStep[] = [
  {
    key: 'start',
    title: 'Start a replay',
    doThis:
      'Open the matches, pick Late comeback and start the replay at a fast speed.',
    shows: 'A whole match plays out in a few minutes, the same way every time.',
    link: lobby,
  },
  {
    key: 'watch',
    title: 'Watch it build',
    doThis:
      'Stay in the Live studio and watch the key moments, the match stats and the graphics preview.',
    shows:
      'Each key moment is spotted in the match data, written up, checked against the data and timed for broadcast.',
  },
  {
    key: 'evidence',
    title: 'Open the evidence',
    doThis:
      'Press Evidence on a key moment. Switch the audience to Analyst to see the Compared with block.',
    shows:
      'The plays and stats behind the moment, and how it compares with the rest of the match.',
  },
  {
    key: 'audience',
    title: 'Change audience and language',
    doThis:
      'Switch the audience, then choose a commentary language, including Naijá (Pidgin).',
    shows:
      'The wording changes for each audience and language while the facts and figures stay identical.',
  },
  {
    key: 'listen',
    title: 'Listen to a moment',
    doThis: 'Press Listen on a key moment.',
    shows:
      'The moment is read aloud with the voice on your own device. Nothing is sent anywhere to make the audio.',
  },
  {
    key: 'factchecks',
    title: 'See the fact checks',
    doThis:
      'Back in the matches, open your replay and choose Fact-checks at the top.',
    shows:
      'Who wrote each moment, and which wrong facts or numbers the fact check stopped before anything went on air.',
    link: lobby,
  },
  {
    key: 'producer',
    title: 'Try the producer view',
    doThis:
      'Sign in as the demo producer, switch publishing to Manual and press Send to air on a waiting graphic. Then open the Activity log.',
    shows:
      'A producer approves each graphic before it airs, and every action is recorded in a log that cannot be edited.',
    link: { label: 'Go to sign in', href: '/sign-in' },
  },
  {
    key: 'recap',
    title: 'Get the recap',
    doThis:
      'At full time, open the recap from the matches and choose Download match report.',
    shows:
      'The result, the key moments and the final stats in one readable report you can keep.',
    link: lobby,
  },
];

export const TOUR_STORAGE_KEY = 'matchiq.studio-tour';

export type TourStep = {
  key: string;
  title: string;
  body: string;
  /** First visible match wins; a step with no visible target is skipped. */
  targets: readonly string[];
};

export const TOUR_TARGETS = {
  scoreboard: '[aria-label="Scoreboard"]',
  preview: 'section[aria-labelledby="overlay-title"]',
  moments: 'section[aria-labelledby="insights-title"]',
  audience: '[data-tour="audience"]',
  evidence: '[aria-label^="See the evidence"]',
  stats: 'section[aria-labelledby="metrics-title"]',
} as const;

export const TOUR_ACTIVE_ATTRIBUTE = 'data-tour-active';

export const TOUR_STEPS: readonly TourStep[] = [
  {
    key: 'scoreboard',
    title: 'Score and graphics preview',
    body: 'The score and clock follow the replay. Below them, the preview shows the graphic viewers would see right now.',
    targets: [TOUR_TARGETS.scoreboard, TOUR_TARGETS.preview],
  },
  {
    key: 'moments',
    title: 'Key moments',
    body: 'Moments appear here as they happen, each written up and checked against the match data.',
    targets: [TOUR_TARGETS.moments],
  },
  {
    key: 'audience',
    title: 'Audience and language',
    body: 'Choose who the commentary is for and which language it is in, including Naijá (Pidgin). The facts never change.',
    targets: [TOUR_TARGETS.audience],
  },
  {
    key: 'evidence',
    title: 'Evidence',
    body: 'Press Evidence on any key moment to see the plays and stats behind it.',
    targets: [TOUR_TARGETS.evidence, TOUR_TARGETS.moments],
  },
  {
    key: 'stats',
    title: 'Match stats',
    body: 'Possession, shots, passing and momentum, all worked out from the match data and never estimated.',
    targets: [TOUR_TARGETS.stats],
  },
];

export const TOUR_COPY = {
  start: 'Take the tour',
  again: 'Take the tour again',
  panelLabel: 'Studio tour',
  step: (n: number, total: number) => `Step ${n} of ${total}`,
  next: 'Next',
  back: 'Back',
  done: 'Done',
  close: 'Close the tour',
  empty: 'Nothing to point at yet. Try again once the match has loaded.',
} as const;

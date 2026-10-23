import type { PlayerPosition } from '@matchiq/contracts';
import type {
  PlayerActionKind,
  PlayerMilestoneKind,
  PlayerTally,
} from '@matchiq/football-engine/player';

export const PLAYER_FOCUS_LIMITS = {
  /** Events pages walked to load a whole match (500 each). */
  ledgerPagesMax: 20,
  timelinePage: 8,
} as const;

export const PLAYER_FOCUS_COPY = {
  id: 'player-focus',
  region: 'Player focus',
  title: 'Player focus',
  description: 'Follow one player through the match.',
  pickerLabel: 'Follow a player',
  pickerPlaceholder: 'Search both squads',
  noTracking: 'No tracking data. Counts come from match events only',
  loading: 'Loading the match so far',
  loadFailed: 'We couldn’t load this player’s match',
  pickTitle: 'Pick a player to follow',
  pickBody:
    'See their passes, shots and big moments, and spot them on the pitch map.',
  quietTitle: (name: string) => `${name} hasn’t been involved yet`,
  quietBody: 'Their actions appear here as soon as they happen.',
  countsLabel: (name: string) => `${name}: match numbers so far`,
  milestonesTitle: 'Milestones',
  momentsTitle: 'Key moments featuring them',
  noMoments: 'Not part of a key moment yet.',
  timelineTitle: 'Their match',
  timelineNoun: { one: 'action', other: 'actions' },
  timelineMore: 'Show earlier actions',
  recent: 'Recently followed',
  switchTo: (name: string) => `Follow ${name} instead`,
  stopFollowing: (name: string) => `Stop following ${name}`,
  followedMark: 'Followed player',
  shirt: (n: number) => `No. ${n}`,
  openMoment: (headline: string) => `Show the evidence for ${headline}`,
  recapTitle: 'Your player’s match',
  recapDescription: 'Final numbers for the player you follow.',
} as const;

export const POSITION_LABELS: Record<PlayerPosition, string> = {
  GK: 'Goalkeeper',
  DF: 'Defender',
  MF: 'Midfielder',
  FW: 'Forward',
};

export const ACTION_LABELS: Record<PlayerActionKind, string> = {
  pass: 'Pass',
  shot: 'Shot',
  pressure: 'Pressed an opponent',
  recovery: 'Won the ball back',
  goal: 'Goal',
  card: 'Card',
};

export const MILESTONE_LABELS: Record<PlayerMilestoneKind, string> = {
  FIRST_SHOT_ON_TARGET: 'First shot on target',
  GOAL: 'Goal',
  BOOKED: 'Booked',
  SENT_OFF: 'Sent off',
};

/** The counts shown, in reading order. Cards combine yellow and red. */
export const TALLY_ITEMS: readonly {
  label: string;
  value: (t: PlayerTally) => number;
  detail?: (t: PlayerTally) => string;
}[] = [
  {
    label: 'Passes',
    value: (t) => t.passesAttempted,
    detail: (t) => `${t.passesCompleted} found a teammate`,
  },
  {
    label: 'Shots',
    value: (t) => t.shots,
    detail: (t) => `${t.shotsOnTarget} on target`,
  },
  { label: 'Goals', value: (t) => t.goals },
  { label: 'Pressures', value: (t) => t.pressures },
  { label: 'Ball wins', value: (t) => t.recoveries },
  {
    label: 'Cards',
    value: (t) => t.yellowCards + t.redCards,
    detail: (t) =>
      t.redCards > 0 ? 'Sent off' : t.yellowCards > 0 ? 'Booked' : 'None',
  },
];

import type { MatchEvent, PitchPoint, ShotOutcome } from '@matchiq/contracts';
import {
  ON_TARGET_OUTCOMES,
  PITCH_COORD_MAX,
  type PitchKind,
  type PitchTeamFilter,
} from '@/constants/pitch';
import { formatMinute } from '@/lib/format';
import type { Side } from '@/components/match/team-swatch';

export type PitchRoster = {
  team: (
    teamId: string | null | undefined,
  ) => { side: Side; shortName: string } | null;
  player: (playerId: string | null | undefined) => string | null;
};

export type PitchMark = {
  id: string;
  kind: PitchKind;
  side: Side;
  teamShort: string;
  minute: string;
  player: string | null;
  /** As recorded: 0..100 toward the attacked goal, from the right touchline. */
  source: PitchPoint;
  /** Screen space: home attacks left to right, 0..100 on both axes. */
  x: number;
  y: number;
  /** Shots only; `true` fills the mark. */
  onTarget: boolean | null;
  outcome: ShotOutcome | null;
  /** Shots only, and only when the data recorded a speed. */
  speedKph: number | null;
  /** By the player the viewer follows. */
  followed?: boolean;
};

/**
 * Home attacks to the right, so its right touchline is the bottom edge (SVG y
 * grows downward). The away team attacks to the left: a 180° rotation.
 */
export const toScreen = (point: PitchPoint, side: Side) =>
  side === 'home'
    ? { x: point.x, y: PITCH_COORD_MAX - point.y }
    : { x: PITCH_COORD_MAX - point.x, y: point.y };

type Plottable = Extract<
  MatchEvent,
  { type: 'SHOT' | 'RECOVERY' | 'FINAL_THIRD_ENTRY' }
>;

const isPlottable = (event: MatchEvent): event is Plottable =>
  event.type === 'SHOT' ||
  event.type === 'RECOVERY' ||
  event.type === 'FINAL_THIRD_ENTRY';

/** Goals carry no location: they are drawn at the shot that scored. */
const scoringShots = (
  events: readonly MatchEvent[],
  voided: Record<string, string>,
): Set<string> => {
  const ids = new Set<string>();
  for (const e of events) {
    if (e.type === 'GOAL' && !voided[e.eventId]) ids.add(e.shotEventId);
  }
  return ids;
};

const toMark = (
  event: Plottable,
  roster: PitchRoster,
  goals: Set<string>,
  followedPlayerId: string | null,
): PitchMark | null => {
  const team = roster.team(event.teamId);
  if (!team) return null;
  const shot = event.type === 'SHOT' ? event : null;
  return {
    id: event.eventId,
    kind: shot && goals.has(event.eventId) ? 'GOAL' : event.type,
    side: team.side,
    teamShort: team.shortName,
    minute: formatMinute(event.period, event.matchClockMs),
    player: roster.player(event.playerId),
    source: event.location,
    ...toScreen(event.location, team.side),
    onTarget: shot ? ON_TARGET_OUTCOMES.has(shot.outcome) : null,
    outcome: shot ? shot.outcome : null,
    speedKph: shot?.speedKph ?? null,
    followed: followedPlayerId !== null && event.playerId === followedPlayerId,
  };
};

/** Marks in match order; voided events are left off the map. */
export const buildPitchMarks = (
  events: readonly MatchEvent[],
  roster: PitchRoster,
  voided: Record<string, string> = {},
  followedPlayerId: string | null = null,
): PitchMark[] => {
  const goals = scoringShots(events, voided);
  const marks: PitchMark[] = [];
  for (const event of events) {
    if (!isPlottable(event) || voided[event.eventId]) continue;
    const mark = toMark(event, roster, goals, followedPlayerId);
    if (mark) marks.push(mark);
  }
  return marks;
};

export type PitchFilter = {
  team: PitchTeamFilter;
  kinds: ReadonlySet<PitchKind>;
};

export const filterMarks = (
  marks: readonly PitchMark[],
  { team, kinds }: PitchFilter,
): PitchMark[] =>
  marks.filter((m) => kinds.has(m.kind) && (team === 'all' || m.side === team));

export const countByKind = (marks: readonly PitchMark[]) => {
  const counts: Record<PitchKind, number> = {
    GOAL: 0,
    SHOT: 0,
    RECOVERY: 0,
    FINAL_THIRD_ENTRY: 0,
  };
  for (const m of marks) counts[m.kind] += 1;
  return counts;
};

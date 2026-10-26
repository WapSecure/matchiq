import type {
  MatchEvent,
  PitchDimensions,
  PitchPoint,
} from '@matchiq/contracts';
import {
  passDifficulty,
  passDistanceM,
} from '@matchiq/football-engine/geometry';
import type { Side } from '@/components/match/team-swatch';
import type { PitchTeamFilter } from '@/constants/pitch';
import {
  DIFFICULTY_BANDS,
  type DifficultyBand,
  PASS_TOP_N,
} from '@/constants/pitch-depth';
import { formatMinute } from '@/lib/format';
import { type PitchRoster, toScreen } from './pitch-events';

export type PassArrow = {
  id: string;
  side: Side;
  teamShort: string;
  minute: string;
  player: string | null;
  from: { x: number; y: number };
  to: { x: number; y: number };
  distanceM: number;
  /** Synthetic, 0-100 (ADR-0040). */
  difficulty: number;
  underPressure: boolean;
  band: DifficultyBand;
};

export const difficultyBand = (difficulty: number): DifficultyBand =>
  difficulty >= DIFFICULTY_BANDS.high
    ? 'higher'
    : difficulty >= DIFFICULTY_BANDS.medium
      ? 'medium'
      : 'lower';

type Attempt = Extract<MatchEvent, { type: 'PASS_ATTEMPTED' }>;

const toArrow = (
  attempt: Attempt,
  roster: PitchRoster,
  pitch: PitchDimensions,
): PassArrow | null => {
  const team = roster.team(attempt.teamId);
  if (!team) return null;
  const start: PitchPoint = attempt.location;
  const end: PitchPoint = attempt.targetLocation;
  const difficulty = passDifficulty(start, end, pitch, attempt.underPressure);
  return {
    id: attempt.eventId,
    side: team.side,
    teamShort: team.shortName,
    minute: formatMinute(attempt.period, attempt.matchClockMs),
    player: roster.player(attempt.playerId),
    from: toScreen(start, team.side),
    to: toScreen(end, team.side),
    distanceM: passDistanceM(start, end, pitch),
    difficulty,
    underPressure: attempt.underPressure,
    band: difficultyBand(difficulty),
  };
};

/** Completed, unvoided passes in match order, measured with the engine's formulas. */
export const buildPassArrows = (
  events: readonly MatchEvent[],
  roster: PitchRoster,
  pitch: PitchDimensions,
  voided: Record<string, string> = {},
): PassArrow[] => {
  const attempts = new Map<string, Attempt>();
  const done = new Set<string>();
  for (const e of events) {
    if (voided[e.eventId]) continue;
    if (e.type === 'PASS_ATTEMPTED') attempts.set(e.eventId, e);
    else if (e.type === 'PASS_COMPLETED') done.add(e.attemptEventId);
  }
  const arrows: PassArrow[] = [];
  for (const [id, attempt] of attempts) {
    if (!done.has(id)) continue;
    const arrow = toArrow(attempt, roster, pitch);
    if (arrow) arrows.push(arrow);
  }
  return arrows;
};

const byHardest = (a: PassArrow, b: PassArrow): number =>
  b.difficulty - a.difficulty ||
  b.distanceM - a.distanceM ||
  a.id.localeCompare(b.id);

export type PassSelection = {
  shown: PassArrow[];
  /** Completed passes for the chosen team(s) before the top-N cut. */
  total: number;
};

/** Top N per team by `byHardest`, so each side keeps its own best passes. */
export const selectPasses = (
  arrows: readonly PassArrow[],
  team: PitchTeamFilter,
  limit: number = PASS_TOP_N,
): PassSelection => {
  const scoped = arrows.filter((a) => team === 'all' || a.side === team);
  const shown = (['home', 'away'] as const).flatMap((side) =>
    scoped
      .filter((a) => a.side === side)
      .sort(byHardest)
      .slice(0, limit),
  );
  return { shown, total: scoped.length };
};

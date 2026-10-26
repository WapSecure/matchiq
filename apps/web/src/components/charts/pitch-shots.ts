import type { PitchDimensions } from '@matchiq/contracts';
import { xgBaseline } from '@matchiq/football-engine/geometry';
import type { PitchTeamFilter } from '@/constants/pitch';
import {
  DEPTH_COPY,
  SHOT_OUTCOME_LABEL,
  SHOT_RADIUS,
} from '@/constants/pitch-depth';
import type { PitchMark } from './pitch-events';

export const isShotMark = (mark: PitchMark): boolean =>
  mark.kind === 'GOAL' || mark.kind === 'SHOT';

/** Shots for the chosen team(s), in match order. */
export const selectShots = (
  marks: readonly PitchMark[],
  team: PitchTeamFilter,
): PitchMark[] =>
  marks.filter((m) => isShotMark(m) && (team === 'all' || m.side === team));

/** Goal largest, then on target, then off target and blocked. */
export const shotRadius = (mark: PitchMark): number => {
  if (mark.kind === 'GOAL') return SHOT_RADIUS.goal;
  return mark.onTarget ? SHOT_RADIUS.onTarget : SHOT_RADIUS.offTarget;
};

export const shotOutcomeLabel = (mark: PitchMark): string =>
  mark.kind === 'GOAL'
    ? DEPTH_COPY.shots.goal
    : mark.outcome
      ? SHOT_OUTCOME_LABEL[mark.outcome]
      : DEPTH_COPY.none;

/** Null when the event carries no recorded speed. */
export const shotSpeedLabel = (mark: PitchMark): string | null =>
  mark.speedKph === null ? null : DEPTH_COPY.speed(mark.speedKph);

/** Uses the engine's own formula; the value is a synthetic baseline. */
export const shotXgLabel = (mark: PitchMark, pitch: PitchDimensions): string =>
  DEPTH_COPY.xg(xgBaseline(mark.source, pitch));

export const shotReadout = (
  mark: PitchMark,
  pitch: PitchDimensions,
  analyst: boolean,
): string =>
  [
    mark.minute,
    mark.teamShort,
    mark.player,
    shotOutcomeLabel(mark),
    shotSpeedLabel(mark),
    analyst ? `${DEPTH_COPY.xgLabel} ${shotXgLabel(mark, pitch)}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

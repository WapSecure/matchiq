import type { PitchDimensions, PitchPoint } from '@matchiq/contracts';
import { PASS_DIFFICULTY, PITCH_SCALE, XG_BASELINE } from '../constants.js';

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

const toMetres = (
  from: PitchPoint,
  to: PitchPoint,
  pitch: PitchDimensions,
): { dx: number; dy: number } => ({
  dx: ((to.x - from.x) / PITCH_SCALE) * pitch.lengthM,
  dy: ((to.y - from.y) / PITCH_SCALE) * pitch.widthM,
});

export const passDistanceM = (
  from: PitchPoint,
  to: PitchPoint,
  pitch: PitchDimensions,
): number => {
  const { dx, dy } = toMetres(from, to, pitch);
  return Math.hypot(dx, dy);
};

/**
 * Synthetic pass difficulty, 0-100: distance + sideways angle + pressure +
 * forward progress, weighted in PASS_DIFFICULTY. Not calibrated to real play.
 */
export const passDifficulty = (
  from: PitchPoint,
  to: PitchPoint,
  pitch: PitchDimensions,
  underPressure: boolean,
): number => {
  const { dx, dy } = toMetres(from, to, pitch);
  const distance = Math.hypot(dx, dy);
  const w = PASS_DIFFICULTY.weights;
  const distanceTerm = clamp01(distance / PASS_DIFFICULTY.maxDistanceM);
  const angleTerm = distance === 0 ? 0 : Math.abs(dy) / distance;
  const progressTerm = clamp01(dx / PASS_DIFFICULTY.maxProgressM);
  return (
    w.distance * distanceTerm +
    w.angle * angleTerm +
    w.pressure * (underPressure ? 1 : 0) +
    w.progression * progressTerm
  );
};

/**
 * Uncalibrated geometric xG baseline: logistic of distance to the goal centre
 * and the angle the goal mouth subtends. Constants are illustrative, not fitted.
 */
export const xgBaseline = (
  shot: PitchPoint,
  pitch: PitchDimensions,
): number => {
  const dx = ((PITCH_SCALE - shot.x) / PITCH_SCALE) * pitch.lengthM;
  const dy = ((shot.y - PITCH_SCALE / 2) / PITCH_SCALE) * pitch.widthM;
  const distance = Math.hypot(dx, dy);
  const half = XG_BASELINE.goalWidthM / 2;
  const raw = Math.atan2(
    XG_BASELINE.goalWidthM * dx,
    dx * dx + dy * dy - half * half,
  );
  const angle = raw < 0 ? raw + Math.PI : raw;
  const c = XG_BASELINE;
  const logit = c.intercept + c.distanceCoef * distance + c.angleCoef * angle;
  return 1 / (1 + Math.exp(-logit));
};

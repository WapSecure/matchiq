import type { PitchPoint } from '@matchiq/contracts';
import { PITCH } from '../constants.js';

export interface Point {
  readonly x: number;
  readonly y: number;
}

const FULL_PITCH = 100;
const ROUNDING = 10 ** PITCH.coordinateDecimals;

const clamp = (value: number): number =>
  Math.min(PITCH.max, Math.max(PITCH.min, value));

export const clampPoint = (point: Point): Point => ({
  x: clamp(point.x),
  y: clamp(point.y),
});

/** Converts between the two teams' attacking frames. */
export const mirror = (point: Point): Point => ({
  x: FULL_PITCH - point.x,
  y: FULL_PITCH - point.y,
});

export const toPitchPoint = (point: Point): PitchPoint => {
  const clamped = clampPoint(point);
  return {
    x: Math.round(clamped.x * ROUNDING) / ROUNDING,
    y: Math.round(clamped.y * ROUNDING) / ROUNDING,
  };
};

export const distance = (a: Point, b: Point): number =>
  Math.hypot(a.x - b.x, a.y - b.y);

/** 0 = own third, 1 = middle third, 2 = final third. */
export const zoneOf = (x: number): 0 | 1 | 2 => {
  if (x >= PITCH.finalThirdX) return 2;
  return x >= PITCH.ownThirdX ? 1 : 0;
};

export const entersFinalThird = (from: Point, to: Point): boolean =>
  from.x < PITCH.finalThirdX && to.x >= PITCH.finalThirdX;

export const CENTRE_SPOT: Point = { x: PITCH.centre, y: PITCH.centre };

import { cumulativeMs } from '@/lib/format';
import { linePath, scale, xDomain, yDomain } from './chart-scale';
import type { MomentumDatum } from './momentum-table';

export const MOMENTUM_WIDTH = 600;
export const MOMENTUM_HEIGHT = 140;

const PERCENT = 100;

/** One sample in percent of the plot box, for HTML markers over a stretched SVG. */
export type MomentumPoint = {
  datum: MomentumDatum;
  x: number;
  home: number | null;
  away: number | null;
};

export type MomentumGeometry = {
  home: string;
  away: string;
  points: MomentumPoint[];
};

const EMPTY: MomentumGeometry = { home: '', away: '', points: [] };

export const momentumGeometry = (
  data: readonly MomentumDatum[],
): MomentumGeometry => {
  const xs = data.map((d) => cumulativeMs(d.period, d.clockMs));
  const dx = xDomain(xs);
  const dy = yDomain(data.flatMap((d) => [d.home, d.away]));
  if (!dx || !dy) return EMPTY;
  const sx = scale(dx, MOMENTUM_WIDTH);
  const sy = scale(dy, MOMENTUM_HEIGHT, true);
  const series = (side: 'home' | 'away') =>
    linePath(
      data.map((d, i) => ({ x: xs[i] ?? 0, y: d[side] })),
      sx,
      sy,
    );
  const pct = (v: number | null) =>
    v === null ? null : (sy(v) / MOMENTUM_HEIGHT) * PERCENT;
  return {
    home: series('home'),
    away: series('away'),
    points: data.map((datum, i) => ({
      datum,
      x: (sx(xs[i] ?? 0) / MOMENTUM_WIDTH) * PERCENT,
      home: pct(datum.home),
      away: pct(datum.away),
    })),
  };
};

/** Nearest sample to a horizontal position given in percent. */
export const nearestPoint = (
  points: readonly MomentumPoint[],
  xPct: number,
): MomentumPoint | null => {
  let best: MomentumPoint | null = null;
  for (const p of points) {
    if (!best || Math.abs(p.x - xPct) < Math.abs(best.x - xPct)) best = p;
  }
  return best;
};

/** Momentum told in words, from the latest sample that has both sides. */
export const momentumLeader = (
  data: readonly MomentumDatum[],
  margin: number,
): 'home' | 'away' | 'level' | null => {
  for (let i = data.length - 1; i >= 0; i -= 1) {
    const d = data[i];
    if (!d || d.home === null || d.away === null) continue;
    if (Math.abs(d.home - d.away) < margin) return 'level';
    return d.home > d.away ? 'home' : 'away';
  }
  return null;
};

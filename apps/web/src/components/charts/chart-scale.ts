export type SeriesPoint = { x: number; y: number | null };

export type Domain = { min: number; max: number };

const PADDING_RATIO = 0.1;
const MIN_SPAN = 1;

export const yDomain = (values: readonly (number | null)[]): Domain | null => {
  const present = values.filter((v): v is number => v !== null);
  if (present.length === 0) return null;
  const lo = Math.min(...present);
  const hi = Math.max(...present);
  const span = Math.max(hi - lo, MIN_SPAN);
  const pad = span * PADDING_RATIO;
  return { min: lo - pad, max: hi + pad };
};

export const xDomain = (xs: readonly number[]): Domain | null => {
  if (xs.length === 0) return null;
  const min = Math.min(...xs);
  const max = Math.max(...xs);
  return { min, max: max === min ? min + 1 : max };
};

export const scale =
  (domain: Domain, size: number, invert = false) =>
  (value: number): number => {
    const t = (value - domain.min) / (domain.max - domain.min);
    return (invert ? 1 - t : t) * size;
  };

const DECIMALS = 1;

/** SVG path that lifts the pen across unavailable samples instead of drawing zero. */
export const linePath = (
  points: readonly SeriesPoint[],
  sx: (v: number) => number,
  sy: (v: number) => number,
): string => {
  let pen = false;
  const parts: string[] = [];
  for (const p of points) {
    if (p.y === null) {
      pen = false;
      continue;
    }
    parts.push(
      `${pen ? 'L' : 'M'}${sx(p.x).toFixed(DECIMALS)},${sy(p.y).toFixed(DECIMALS)}`,
    );
    pen = true;
  }
  return parts.join('');
};

/** Half-away-from-zero rounding to a fixed number of decimals; never returns -0. */
export const roundTo = (value: number, decimals: number): number => {
  const factor = 10 ** decimals;
  const rounded = Math.sign(value) * Math.round(Math.abs(value) * factor);
  return rounded / factor + 0;
};

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/**
 * Largest-remainder split of `total` in proportion to non-negative integer
 * `parts`, to `decimals` places, so the shares always sum to `total`. Integer
 * arithmetic keeps remainders exact; equal remainders favour the earlier part.
 */
export const largestRemainderShares = (
  parts: readonly number[],
  total: number,
  decimals: number,
): number[] => {
  const sum = parts.reduce((acc, p) => acc + p, 0);
  const units = Math.round(total * 10 ** decimals);
  const scaled = parts.map((p) => p * units);
  const floors = scaled.map((s) => Math.floor(s / sum));
  let left = units - floors.reduce((acc, f) => acc + f, 0);
  const byRemainder = scaled
    .map((s, index) => ({ index, remainder: s % sum }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (const { index } of byRemainder) {
    if (left === 0) break;
    floors[index] = (floors[index] ?? 0) + 1;
    left -= 1;
  }
  return floors.map((f) => f / 10 ** decimals);
};

/** Half-away-from-zero rounding to a fixed number of decimals; never returns -0. */
export const roundTo = (value: number, decimals: number): number => {
  const factor = 10 ** decimals;
  const rounded = Math.sign(value) * Math.round(Math.abs(value) * factor);
  return rounded / factor + 0;
};

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

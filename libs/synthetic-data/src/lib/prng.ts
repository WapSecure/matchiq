export interface Rng {
  /** Uniform float in [0, 1). */
  next(): number;
  /** Uniform float in [min, max). */
  range(min: number, max: number): number;
  /** Uniform integer in [min, max], both inclusive. */
  int(min: number, max: number): number;
  chance(probability: number): boolean;
  pick<T>(items: readonly T[]): T;
  weighted<T>(entries: readonly (readonly [T, number])[]): T;
  shuffle<T>(items: readonly T[]): T[];
}

const UINT32 = 0x1_0000_0000;
const MULBERRY_INCREMENT = 0x6d2b79f5;

/** mulberry32: 32-bit state, fast, and good enough for simulation (not cryptographic). */
const mulberry32 = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + MULBERRY_INCREMENT) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / UINT32;
  };
};

const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

/** Mixes a label into a seed (FNV-1a) so each scenario draws an independent stream. */
export const deriveSeed = (seed: number, label: string): number => {
  let hash = (FNV_OFFSET ^ seed) >>> 0;
  for (let i = 0; i < label.length; i += 1) {
    hash = Math.imul(hash ^ label.charCodeAt(i), FNV_PRIME) >>> 0;
  }
  return hash;
};

const at = <T>(items: readonly T[], index: number): T => {
  const item = items[index];
  if (item === undefined) throw new RangeError('index out of range');
  return item;
};

export const createRng = (seed: number): Rng => {
  const next = mulberry32(seed);
  const range = (min: number, max: number) => min + (max - min) * next();
  const int = (min: number, max: number) =>
    min + Math.floor(next() * (max - min + 1));

  return {
    next,
    range,
    int,
    chance: (probability) => next() < probability,
    pick: (items) => {
      if (items.length === 0) throw new RangeError('cannot pick from empty');
      return at(items, int(0, items.length - 1));
    },
    weighted: (entries) => {
      const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
      if (total <= 0) throw new RangeError('weights must sum above zero');
      let roll = next() * total;
      for (const [value, weight] of entries) {
        roll -= weight;
        if (roll < 0) return value;
      }
      const positive = entries.filter(([, weight]) => weight > 0);
      return at(positive, positive.length - 1)[0];
    },
    shuffle: (items) => {
      const copy = [...items];
      for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = int(0, i);
        [copy[i], copy[j]] = [at(copy, j), at(copy, i)];
      }
      return copy;
    },
  };
};

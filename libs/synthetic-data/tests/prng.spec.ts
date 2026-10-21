import fc from 'fast-check';
import { createRng } from '../src/index.js';
import { deriveSeed } from '../src/lib/prng.js';

const draw = (seed: number, count: number): number[] => {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => rng.next());
};

describe('createRng', () => {
  it('is deterministic per seed and differs across seeds', () => {
    expect(draw(42, 50)).toEqual(draw(42, 50));
    expect(draw(42, 50)).not.toEqual(draw(43, 50));
  });

  it('keeps every primitive inside its documented range', () => {
    fc.assert(
      fc.property(
        fc.nat(),
        fc.integer({ min: -50, max: 50 }),
        fc.nat({ max: 100 }),
        (seed, min, span) => {
          const rng = createRng(seed);
          const max = min + span;
          for (let i = 0; i < 50; i += 1) {
            const f = rng.next();
            expect(f).toBeGreaterThanOrEqual(0);
            expect(f).toBeLessThan(1);
            const n = rng.int(min, max);
            expect(Number.isInteger(n)).toBe(true);
            expect(n).toBeGreaterThanOrEqual(min);
            expect(n).toBeLessThanOrEqual(max);
            const r = rng.range(min, max + 1);
            expect(r).toBeGreaterThanOrEqual(min);
            expect(r).toBeLessThan(max + 1);
          }
        },
      ),
    );
  });

  it('never picks a zero-weight entry and rejects empty input', () => {
    const rng = createRng(7);
    for (let i = 0; i < 500; i += 1) {
      expect(
        rng.weighted([
          ['a', 0],
          ['b', 1],
          ['c', 0],
        ] as const),
      ).toBe('b');
    }
    expect(() => rng.weighted([['a', 0]] as const)).toThrow(RangeError);
    expect(() => rng.pick([])).toThrow(RangeError);
  });

  it('shuffles into a permutation without mutating the input', () => {
    fc.assert(
      fc.property(
        fc.nat(),
        fc.array(fc.integer(), { maxLength: 30 }),
        (seed, items) => {
          const copy = [...items];
          const shuffled = createRng(seed).shuffle(items);
          expect(items).toEqual(copy);
          expect([...shuffled].sort((a, b) => a - b)).toEqual(
            [...items].sort((a, b) => a - b),
          );
        },
      ),
    );
  });

  it('derives independent seeds per label', () => {
    expect(deriveSeed(42, 'comeback')).toBe(deriveSeed(42, 'comeback'));
    expect(deriveSeed(42, 'comeback')).not.toBe(deriveSeed(42, 'low-event'));
    expect(deriveSeed(42, 'comeback')).not.toBe(deriveSeed(43, 'comeback'));
  });
});

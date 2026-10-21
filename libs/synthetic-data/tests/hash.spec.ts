import { canonicalJson, hashEvents, sha256Hex } from '../src/index.js';
import { sampleMatch } from './helpers.js';

describe('canonical hashing', () => {
  it('sorts keys at every depth and drops undefined members', () => {
    expect(
      canonicalJson({ b: 1, a: { d: [2, { z: 1, y: undefined }], c: null } }),
    ).toBe('{"a":{"c":null,"d":[2,{"z":1}]},"b":1}');
    expect(canonicalJson({ a: 1, b: 2 })).toBe(canonicalJson({ b: 2, a: 1 }));
  });

  it('rejects non-finite numbers', () => {
    expect(() => canonicalJson({ a: Number.NaN })).toThrow(TypeError);
  });

  it('matches the published SHA-256 test vector', () => {
    expect(sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('is insensitive to key order but sensitive to content', () => {
    const { events } = sampleMatch();
    const reordered = events.map((event) =>
      Object.fromEntries(Object.entries(event).reverse()),
    ) as typeof events;
    expect(hashEvents(reordered)).toBe(hashEvents(events));
    const changed = structuredClone(events);
    const last = changed.at(-1);
    if (last === undefined) throw new Error('empty sample');
    last.matchClockMs += 1;
    expect(hashEvents(changed)).not.toBe(hashEvents(events));
  });
});

import { canonicalJson, hashCanonical, hashText } from './canonical-json.js';

describe('canonicalJson', () => {
  it('is independent of key insertion order at every depth', () => {
    expect(canonicalJson({ b: 1, a: { d: 2, c: [3, { f: 4, e: 5 }] } })).toBe(
      '{"a":{"c":[3,{"e":5,"f":4}],"d":2},"b":1}',
    );
  });

  it('drops undefined object members and encodes undefined array items as null', () => {
    expect(canonicalJson({ a: 1, b: undefined })).toBe('{"a":1}');
    expect(canonicalJson([1, undefined])).toBe('[1,null]');
  });

  it('preserves array order and value types', () => {
    expect(canonicalJson([2, 1])).not.toBe(canonicalJson([1, 2]));
    expect(canonicalJson({ a: 1 })).not.toBe(canonicalJson({ a: '1' }));
  });

  it('sorts keys by UTF-16 code unit like Array.prototype.sort', () => {
    expect(canonicalJson({ b: 1, B: 2, a: 3 })).toBe('{"B":2,"a":3,"b":1}');
  });

  it.each([
    Number.NaN,
    Number.POSITIVE_INFINITY,
    () => 1,
    Symbol('x'),
    BigInt(1),
  ])('rejects values JSON cannot represent faithfully (%s)', (value) => {
    expect(() => canonicalJson({ value })).toThrow(TypeError);
  });
});

describe('hashing', () => {
  it('hashes UTF-8 text to lowercase SHA-256 hex', () => {
    expect(hashText('')).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });

  it('matches the published SHA-256 test vector', () => {
    expect(hashText('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('hashes values via their canonical JSON', () => {
    expect(hashCanonical({ b: 1, a: 2 })).toBe(hashText('{"a":2,"b":1}'));
  });
});

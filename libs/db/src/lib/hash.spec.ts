import { canonicalJson, sha256Hex } from './hash.js';

describe('canonical hashing', () => {
  it('ignores object key order at every depth', () => {
    const a = { b: 1, a: { y: [1, { q: 1, p: 2 }], x: 'x' } };
    const b = { a: { x: 'x', y: [1, { p: 2, q: 1 }] }, b: 1 };
    expect(canonicalJson(a)).toBe(canonicalJson(b));
    expect(sha256Hex(a)).toBe(sha256Hex(b));
  });

  it('treats undefined properties as absent', () => {
    expect(sha256Hex({ a: 1, b: undefined })).toBe(sha256Hex({ a: 1 }));
  });

  it('distinguishes array order and values', () => {
    expect(sha256Hex([1, 2])).not.toBe(sha256Hex([2, 1]));
    expect(sha256Hex({ a: 1 })).not.toBe(sha256Hex({ a: '1' }));
  });

  it('produces 64 lowercase hex characters', () => {
    expect(sha256Hex({})).toMatch(/^[0-9a-f]{64}$/);
  });
});

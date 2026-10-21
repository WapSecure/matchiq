import { createHash } from 'node:crypto';

const HASH_ALGORITHM = 'sha256';
const HASH_ENCODING = 'hex';

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

const canonicalise = (value: unknown): Json | undefined => {
  if (
    value === null ||
    typeof value === 'boolean' ||
    typeof value === 'string'
  ) {
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value))
      throw new TypeError('canonical JSON forbids non-finite numbers');
    return value;
  }
  if (Array.isArray(value))
    return value.map((item) => canonicalise(item) ?? null);
  if (typeof value === 'object') {
    const result: { [key: string]: Json } = {};
    for (const key of Object.keys(value).sort()) {
      const member = canonicalise((value as Record<string, unknown>)[key]);
      if (member !== undefined) result[key] = member;
    }
    return result;
  }
  if (value === undefined) return undefined;
  throw new TypeError(`canonical JSON cannot encode ${typeof value}`);
};

/**
 * JSON with object keys sorted (UTF-16 code unit order) at every depth and
 * `undefined` members dropped, so structurally equal values serialise to
 * identical bytes. Non-finite numbers, functions, symbols and bigints throw.
 */
export const canonicalJson = (value: unknown): string =>
  JSON.stringify(canonicalise(value) ?? null);

export const hashText = (text: string): string =>
  createHash(HASH_ALGORITHM).update(text, 'utf8').digest(HASH_ENCODING);

/** SHA-256 hex of the canonical JSON of `value`. */
export const hashCanonical = (value: unknown): string =>
  hashText(canonicalJson(value));

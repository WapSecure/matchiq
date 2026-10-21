import { createHash } from 'node:crypto';
import { HASH_ALGORITHM, HASH_ENCODING } from './constants.js';

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

const canonicalise = (value: unknown): Json => {
  if (Array.isArray(value)) return value.map(canonicalise);
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return Object.fromEntries(entries.map(([k, v]) => [k, canonicalise(v)]));
  }
  return value as Json;
};

/** Key-order-insensitive JSON serialisation, so equal payloads hash equally. */
export const canonicalJson = (value: unknown): string =>
  JSON.stringify(canonicalise(value));

export const sha256Hex = (value: unknown): string =>
  createHash(HASH_ALGORITHM).update(canonicalJson(value)).digest(HASH_ENCODING);

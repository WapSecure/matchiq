import { createHash } from 'node:crypto';
import type { MatchEvent } from '@matchiq/contracts';
import { HASH } from './constants.js';

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
    if (!Number.isFinite(value)) throw new TypeError('non-finite number');
    return value;
  }
  if (Array.isArray(value))
    return value.map((item) => canonicalise(item) ?? null);
  if (typeof value === 'object') {
    const entries = Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    const result: { [key: string]: Json } = {};
    for (const [key, v] of entries) {
      const canonical = canonicalise(v);
      if (canonical !== undefined) result[key] = canonical;
    }
    return result;
  }
  return undefined;
};

/** JSON with keys sorted at every depth and `undefined` members dropped. */
export const canonicalJson = (value: unknown): string =>
  JSON.stringify(canonicalise(value) ?? null);

export const sha256Hex = (text: string): string =>
  createHash(HASH.algorithm).update(text, 'utf8').digest(HASH.encoding);

export const hashEvents = (events: readonly MatchEvent[]): string =>
  sha256Hex(canonicalJson(events));

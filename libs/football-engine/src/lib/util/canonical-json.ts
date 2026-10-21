import { createHash } from 'node:crypto';

export type Json =
  | null
  | boolean
  | number
  | string
  | readonly Json[]
  | { readonly [key: string]: Json | undefined };

/**
 * JSON with object keys sorted recursively and `undefined` members dropped, so
 * structurally equal values always serialise to identical bytes.
 */
export const canonicalJson = (value: Json): string => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((item: Json) => canonicalJson(item)).join(',')}]`;
  }
  const record = value as { readonly [key: string]: Json | undefined };
  const members = Object.keys(record)
    .sort()
    .flatMap((key) => {
      const member = record[key];
      return member === undefined
        ? []
        : [`${JSON.stringify(key)}:${canonicalJson(member)}`];
    });
  return `{${members.join(',')}}`;
};

export const sha256Hex = (text: string): string =>
  createHash('sha256').update(text).digest('hex');

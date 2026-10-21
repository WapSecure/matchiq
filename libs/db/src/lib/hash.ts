import { hashCanonical } from '@matchiq/canonical-json';

export { canonicalJson } from '@matchiq/canonical-json';

/** SHA-256 hex of the canonical JSON of `value`; used for payload and request hashes. */
export const sha256Hex = (value: unknown): string => hashCanonical(value);

import { MATCH_CODE } from '@/constants/match-code';

const { alphabet, bitsPerChar, checksumLength } = MATCH_CODE;
const CHECKSUM_BITS = bitsPerChar * checksumLength;
const CHAR_MASK = (1 << bitsPerChar) - 1;
const WORD_BITS = 32;

/** FNV-1a, used only when a hash is not hex so the code stays deterministic. */
const fnv1a = (text: string): number => {
  let hash: number = MATCH_CODE.fnvOffset;
  for (const char of text) {
    hash = Math.imul(hash ^ char.charCodeAt(0), MATCH_CODE.fnvPrime) >>> 0;
  }
  return hash;
};

const leadingBits = (hash: string): number =>
  MATCH_CODE.hexPattern.test(hash)
    ? parseInt(hash.slice(0, MATCH_CODE.hexPrefixLength), 16)
    : fnv1a(hash) >>> (WORD_BITS - CHECKSUM_BITS);

/** The first 20 bits of the events hash as four Crockford base32 characters. */
export const checksumOf = (eventsHash: string): string => {
  const bits = leadingBits(eventsHash);
  let out = '';
  for (let i = checksumLength - 1; i >= 0; i--) {
    out += alphabet[(bits >>> (i * bitsPerChar)) & CHAR_MASK];
  }
  return out;
};

/** `PEN-MAR · 7K3F`: the same events always give the same code. */
export const matchCode = (
  homeShort: string,
  awayShort: string,
  eventsHash: string,
): string =>
  `${homeShort.toUpperCase()}${MATCH_CODE.teamSeparator}${awayShort.toUpperCase()}${MATCH_CODE.checksumSeparator}${checksumOf(eventsHash)}`;

/** Splits `fx_comeback_42_s5` into its template id and replay number. */
export const parseSessionId = (
  sessionId: string,
): { templateId: string; replay: number | null } => {
  const found = MATCH_CODE.sessionSuffix.exec(sessionId);
  return found
    ? { templateId: sessionId.slice(0, found.index), replay: Number(found[1]) }
    : { templateId: sessionId, replay: null };
};

/** Filesystem-safe form of a code, for download names. */
export const matchCodeSlug = (code: string): string =>
  code.replace(MATCH_CODE.checksumSeparator, MATCH_CODE.teamSeparator);

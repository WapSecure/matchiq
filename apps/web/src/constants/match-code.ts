export const MATCH_CODE = {
  /** Crockford base32: no I, L, O or U, so a code reads aloud without mix-ups. */
  alphabet: '0123456789ABCDEFGHJKMNPQRSTVWXYZ',
  bitsPerChar: 5,
  checksumLength: 4,
  teamSeparator: '-',
  checksumSeparator: ' · ',
  hexPrefixLength: 5,
  hexPattern: /^[0-9a-f]{5,}$/i,
  sessionSuffix: /_s(\d+)$/,
  fnvOffset: 0x811c9dc5,
  fnvPrime: 0x01000193,
} as const;

export const MATCH_CODE_COPY = {
  label: 'Match code',
  hint: 'Every replay of this match uses the same code, so results are identical.',
  copy: 'Copy match code',
  copied: 'Copied',
  replay: (n: number) => `Replay ${n}`,
  technical: {
    seed: 'Seed',
    hash: 'Events hash',
  },
} as const;

export const COPIED_RESET_MS = 2_000;

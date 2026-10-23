import { BYTES_PER_UNIT, FILE_COPY, FILE_SIZE_UNITS } from '@/constants/ui';

export type FileRules = {
  /** MIME types (`application/json`, `image/*`) or extensions (`.csv`). */
  accept: readonly string[];
  /** Plain-language list for messages, e.g. "JSON or CSV". */
  acceptLabel: string;
  maxBytes: number;
  maxFiles?: number;
};

export type FileRejection = { name: string; reason: string };
export type FileCheck = { accepted: File[]; rejected: FileRejection[] };

const SIZE_DECIMALS = 1;

export const formatBytes = (bytes: number): string => {
  let value = bytes;
  let unit = 0;
  while (value >= BYTES_PER_UNIT && unit < FILE_SIZE_UNITS.length - 1) {
    value /= BYTES_PER_UNIT;
    unit += 1;
  }
  const digits = unit === 0 || Number.isInteger(value) ? 0 : SIZE_DECIMALS;
  return `${value.toFixed(digits)} ${FILE_SIZE_UNITS[unit]}`;
};

const WILDCARD_SUFFIX = '/*';

/** Matches the `accept` attribute's rules: exact MIME, `type/*`, or extension. */
export const matchesAccept = (
  file: { name: string; type: string },
  accept: readonly string[],
): boolean => {
  if (accept.length === 0) return true;
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return accept.some((rule) => {
    const r = rule.toLowerCase();
    if (r.startsWith('.')) return name.endsWith(r);
    // `image/*` keeps its slash so `image/png` matches and `imagery` does not.
    if (r.endsWith(WILDCARD_SUFFIX)) return type.startsWith(r.slice(0, -1));
    return type === r;
  });
};

/** Splits a selection into files to keep and plain-language reasons for the rest. */
export const checkFiles = (
  files: readonly File[],
  rules: FileRules,
): FileCheck => {
  const max = formatBytes(rules.maxBytes);
  const accepted: File[] = [];
  const rejected: FileRejection[] = [];
  for (const file of files) {
    if (!matchesAccept(file, rules.accept))
      rejected.push({
        name: file.name,
        reason: FILE_COPY.wrongType(file.name, rules.acceptLabel),
      });
    else if (file.size > rules.maxBytes)
      rejected.push({
        name: file.name,
        reason: FILE_COPY.tooLarge(file.name, max),
      });
    else accepted.push(file);
  }
  const limit = rules.maxFiles;
  if (limit !== undefined && accepted.length > limit) {
    rejected.push({ name: '', reason: FILE_COPY.tooMany(limit) });
    accepted.length = limit;
  }
  return { accepted, rejected };
};

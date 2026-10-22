import {
  REDACTED,
  REDACTED_KEY_PATTERN,
  REDACTED_TEXT_PATTERNS,
  REDACTION_MAX_DEPTH,
} from './telemetry.constants';

/** Replaces credential shapes (bearer tokens, URL userinfo, key=value secrets) in text. */
export const scrubText = (text: string): string =>
  REDACTED_TEXT_PATTERNS.reduce(
    (out, [pattern, replacement]) => out.replace(pattern, replacement),
    text,
  );

const redactAt = (value: unknown, depth: number): unknown => {
  if (typeof value === 'string') return scrubText(value);
  if (value === null || typeof value !== 'object') return value;
  if (depth >= REDACTION_MAX_DEPTH) return REDACTED;
  if (value instanceof Error) {
    return { name: value.name, message: scrubText(value.message) };
  }
  if (Array.isArray(value)) return value.map((v) => redactAt(v, depth + 1));
  return Object.fromEntries(
    Object.entries(value).map(([key, v]) => [
      key,
      REDACTED_KEY_PATTERN.test(key) ? REDACTED : redactAt(v, depth + 1),
    ]),
  );
};

/**
 * A copy of `value` safe to log: secret-named fields are masked, credential
 * shapes in strings are scrubbed and nesting is bounded.
 */
export const redact = <T>(value: T): T => redactAt(value, 0) as T;

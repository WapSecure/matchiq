import { z } from 'zod';
import {
  CSV_SEPARATOR,
  ENV_LIMITS,
  ENV_MESSAGES,
  ENV_PATTERNS,
} from './constants.js';

export const flag = (fallback: 'true' | 'false') =>
  z
    .enum(['true', 'false'])
    .default(fallback)
    .transform((v) => v === 'true');

export const booleanFlag = flag('false');

/** Blank values (e.g. `KEY=` copied from .env.example) mean "not set". */
export const optionalString = z.preprocess(
  (v) => (v === '' ? undefined : v),
  z.string().min(1).optional(),
);

export const optionalUrl = z.preprocess(
  (v) => (v === '' ? undefined : v),
  z.url().optional(),
);

export const optionalSecret = z.preprocess(
  (v) => (v === '' ? undefined : v),
  z.string().min(ENV_LIMITS.secretMinLength).optional(),
);

export const boundedInt = (min: number, max: number, fallback: number) =>
  z.coerce.number().int().min(min).max(max).default(fallback);

export const port = (fallback: number) =>
  z.coerce.number().int().min(1).max(ENV_LIMITS.portMax).default(fallback);

export const csv = z
  .string()
  .default('')
  .transform((v) =>
    v
      .split(CSV_SEPARATOR)
      .map((s) => s.trim())
      .filter(Boolean),
  );

/**
 * Exact browser origins (`scheme://host[:port]`). Wildcards, paths and
 * schemes other than http(s) are rejected so a typo cannot widen CORS.
 */
export const originList = csv.pipe(
  z.array(z.string().regex(ENV_PATTERNS.origin, ENV_MESSAGES.origin)),
);

export const secret = z.string().min(ENV_LIMITS.secretMinLength);
export const orgIdField = (fallback: string) =>
  z.string().regex(ENV_PATTERNS.orgId).default(fallback);

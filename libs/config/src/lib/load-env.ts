import type { z } from 'zod';
import { REQUIRED_MESSAGE } from './constants.js';

const ROOT_PATH = '(root)';

export class ConfigError extends Error {
  constructor(readonly issues: readonly string[]) {
    super(`Invalid environment configuration:\n  - ${issues.join('\n  - ')}`);
    this.name = 'ConfigError';
  }
}

type EnvSource = Readonly<Record<string, string | undefined>>;

const describeIssue = (issue: z.core.$ZodIssue): string => {
  const key = issue.path.join('.') || ROOT_PATH;
  const missing = issue.code === 'invalid_type' && issue.input === undefined;
  return `${key}: ${missing ? REQUIRED_MESSAGE : issue.message}`;
};

/**
 * Validates environment variables against a schema. Issue messages carry only
 * variable names and expectations, never received values, so secrets cannot leak
 * into logs.
 */
export const loadEnv = <S extends z.ZodType>(
  schema: S,
  source: EnvSource = process.env,
): z.infer<S> => {
  const result = schema.safeParse(source);
  if (result.success) return result.data;
  throw new ConfigError(result.error.issues.map(describeIssue));
};

import { z } from 'zod';
import { DEFAULT_METRICS } from './constants.js';
import { optionalUrl } from './fields.js';

export const LogFormat = z.enum(['json', 'pretty']);

/**
 * Logs, traces and metrics (docs/operations/OBSERVABILITY.md). Tracing stays
 * off unless `OTEL_EXPORTER_OTLP_ENDPOINT` is set.
 */
export const TelemetryEnv = z.object({
  /** Blank: `pretty` when APP_ENV=local, otherwise `json`. */
  LOG_FORMAT: z.preprocess(
    (v) => (v === '' ? undefined : v),
    LogFormat.optional(),
  ),
  OTEL_EXPORTER_OTLP_ENDPOINT: optionalUrl,
  /** The metrics listener's bind address; it is internal and never proxied. */
  METRICS_HOST: z.string().min(1).default(DEFAULT_METRICS.host),
});

/** `0` turns the metrics listener off. */
export const metricsPort = (fallback: number) =>
  z.coerce
    .number()
    .int()
    .min(0)
    .max(DEFAULT_METRICS.portMax)
    .default(fallback);

export type LogFormat = z.infer<typeof LogFormat>;
export type TelemetryEnv = z.infer<typeof TelemetryEnv>;

import { TRACING, TRACING_NOTICES } from './telemetry.constants';
import { markTracingActive } from './tracing-state';

export interface TracingOptions {
  readonly serviceName: string;
  readonly version: string;
  readonly environment: string;
  /** OTLP/HTTP base URL, e.g. http://localhost:4318. Unset means tracing is off. */
  readonly endpoint?: string;
  readonly azureConnectionString?: string;
}

export interface TracingHandle {
  readonly enabled: boolean;
  /** Something the operator should know, logged once the logger exists. */
  readonly notice?: string;
  shutdown(): Promise<void>;
}

const disabled = (notice?: string): TracingHandle => ({
  enabled: false,
  ...(notice === undefined ? {} : { notice }),
  shutdown: () => Promise.resolve(),
});

/**
 * Starts the OpenTelemetry Node SDK when an OTLP endpoint is configured. It
 * must run before the app's modules load so http, express, nest, pg and
 * ioredis are patched; otherwise the SDK is never loaded and every span call
 * is the API's free no-op.
 */
export const startTracing = async (
  options: TracingOptions,
): Promise<TracingHandle> => {
  if (process.env[TRACING.disabledFlag] === 'true') return disabled();
  if (options.endpoint === undefined) {
    return disabled(
      options.azureConnectionString === undefined
        ? undefined
        : TRACING_NOTICES.azureViaCollector,
    );
  }
  const { createTracingSdk } = await import('./tracing-sdk.js');
  const sdk = createTracingSdk({ ...options, endpoint: options.endpoint });
  sdk.start();
  markTracingActive(true);
  return {
    enabled: true,
    notice: TRACING_NOTICES.enabled(options.endpoint),
    shutdown: async () => {
      markTracingActive(false);
      await sdk.shutdown();
    },
  };
};

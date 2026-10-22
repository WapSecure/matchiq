import type { IncomingMessage } from 'node:http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { IORedisInstrumentation } from '@opentelemetry/instrumentation-ioredis';
import { NestInstrumentation } from '@opentelemetry/instrumentation-nestjs-core';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { QUIET_ROUTE_PATTERN, TRACING } from './telemetry.constants';
import type { TracingOptions } from './tracing';

/** Metrics stay on Prometheus and logs on stdout; the SDK only exports traces. */
const SIGNALS_OFF = ['OTEL_METRICS_EXPORTER', 'OTEL_LOGS_EXPORTER'] as const;

const quiet = (req: IncomingMessage): boolean =>
  QUIET_ROUTE_PATTERN.test((req.url ?? '').split('?')[0] ?? '');

/** Loaded only when tracing is on, so a disabled service never pays for the SDK. */
export const createTracingSdk = (
  options: TracingOptions & { readonly endpoint: string },
): NodeSDK => {
  for (const name of SIGNALS_OFF) process.env[name] ??= 'none';
  const { attributes } = TRACING;
  return new NodeSDK({
    resource: resourceFromAttributes({
      [attributes.serviceName]: options.serviceName,
      [attributes.serviceVersion]: options.version,
      [attributes.environment]: options.environment,
    }),
    traceExporter: new OTLPTraceExporter({
      url: new URL(TRACING.tracesPath, options.endpoint).toString(),
    }),
    instrumentations: [
      new HttpInstrumentation({ ignoreIncomingRequestHook: quiet }),
      new ExpressInstrumentation(),
      new NestInstrumentation(),
      // Parent-less calls are the outbox poll and BullMQ's blocking reads: noise.
      new PgInstrumentation({ requireParentSpan: true }),
      new IORedisInstrumentation({ requireParentSpan: true }),
    ],
  });
};

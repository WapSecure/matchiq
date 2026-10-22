import {
  context,
  isSpanContextValid,
  propagation,
  type Span,
  SpanKind,
  SpanStatusCode,
  trace,
} from '@opentelemetry/api';
import { BullMQOtel } from 'bullmq-otel';
import type { Telemetry } from 'bullmq';
import { LOG_FIELDS, TRACING } from './telemetry.constants';
import { isTracingActive } from './tracing-state';

/** `traceId`/`spanId` of the active span, for log correlation; empty when tracing is off. */
export const activeTraceFields = (): Record<string, string> => {
  const span = trace.getActiveSpan();
  if (!span) return {};
  const ctx = span.spanContext();
  if (!isSpanContextValid(ctx)) return {};
  return { [LOG_FIELDS.traceId]: ctx.traceId, [LOG_FIELDS.spanId]: ctx.spanId };
};

/** Adds W3C `traceparent`/`tracestate` for the active span; a no-op when tracing is off. */
export const injectTraceHeaders = (
  headers: Record<string, string>,
): Record<string, string> => {
  propagation.inject(context.active(), headers);
  return headers;
};

/** BullMQ's own producer/consumer spans carry trace context through job options. */
export const queueTelemetry = (): Telemetry | undefined =>
  isTracingActive() ? new BullMQOtel(TRACING.queueTracer) : undefined;

/** Runs `fn` inside a CLIENT span; with tracing off the span is a free no-op. */
export const withClientSpan = <T>(
  name: string,
  attributes: Record<string, string | number>,
  fn: (span: Span) => Promise<T>,
): Promise<T> =>
  trace
    .getTracer(TRACING.clientTracer)
    .startActiveSpan(name, { kind: SpanKind.CLIENT, attributes }, async (span) => {
      try {
        return await fn(span);
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : String(error),
        });
        throw error;
      } finally {
        span.end();
      }
    });

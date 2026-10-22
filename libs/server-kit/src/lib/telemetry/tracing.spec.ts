import { BullMQOtel } from 'bullmq-otel';
import {
  injectTraceHeaders,
  queueTelemetry,
  withClientSpan,
} from './trace-context';
import { TRACING_NOTICES } from './telemetry.constants';
import { startTracing } from './tracing';
import { isTracingActive, markTracingActive } from './tracing-state';

const base = {
  serviceName: 'matchiq-test',
  version: '1.0.0',
  environment: 'test',
};

describe('tracing when not configured', () => {
  afterEach(() => markTracingActive(false));

  it('stays off without an OTLP endpoint and never loads the SDK', async () => {
    const handle = await startTracing(base);
    expect(handle.enabled).toBe(false);
    expect(handle.notice).toBeUndefined();
    expect(isTracingActive()).toBe(false);
    await expect(handle.shutdown()).resolves.toBeUndefined();
  });

  it('explains the Azure route when only an App Insights connection string is set', async () => {
    const handle = await startTracing({
      ...base,
      azureConnectionString: 'InstrumentationKey=abc',
    });
    expect(handle.enabled).toBe(false);
    expect(handle.notice).toBe(TRACING_NOTICES.azureViaCollector);
  });

  it('honours OTEL_SDK_DISABLED even with an endpoint', async () => {
    process.env['OTEL_SDK_DISABLED'] = 'true';
    try {
      const handle = await startTracing({
        ...base,
        endpoint: 'http://127.0.0.1:4318',
      });
      expect(handle.enabled).toBe(false);
    } finally {
      delete process.env['OTEL_SDK_DISABLED'];
    }
  });

  it('adds no BullMQ telemetry and no trace headers', async () => {
    expect(queueTelemetry()).toBeUndefined();
    expect(injectTraceHeaders({ a: 'b' })).toEqual({ a: 'b' });
    await expect(withClientSpan('noop', {}, async () => 7)).resolves.toBe(7);
  });

  it('hands BullMQ an OpenTelemetry adapter once tracing is active', () => {
    markTracingActive(true);
    expect(queueTelemetry()).toBeInstanceOf(BullMQOtel);
  });
});

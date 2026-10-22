import { ApiEnv, WorkerEnv, loadEnv } from '../index.js';

const BASE = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  REDIS_URL: 'redis://localhost:6379',
  OPERATOR_API_KEY: 'k'.repeat(32),
  AGENTS_SERVICE_TOKEN: 't'.repeat(32),
};

describe('telemetry environment', () => {
  it('keeps tracing off and metrics on internal ports by default', () => {
    const api = loadEnv(ApiEnv, BASE);
    const worker = loadEnv(WorkerEnv, BASE);
    expect(api.OTEL_EXPORTER_OTLP_ENDPOINT).toBeUndefined();
    expect(api.LOG_FORMAT).toBeUndefined();
    expect(api.METRICS_HOST).toBe('127.0.0.1');
    expect(api.METRICS_PORT).toBe(9464);
    expect(worker.METRICS_PORT).toBe(9465);
  });

  it('treats blank values copied from .env.example as unset', () => {
    const env = loadEnv(ApiEnv, {
      ...BASE,
      OTEL_EXPORTER_OTLP_ENDPOINT: '',
      LOG_FORMAT: '',
    });
    expect(env.OTEL_EXPORTER_OTLP_ENDPOINT).toBeUndefined();
    expect(env.LOG_FORMAT).toBeUndefined();
  });

  it('accepts an OTLP endpoint, a log format and a disabled metrics port', () => {
    const env = loadEnv(WorkerEnv, {
      ...BASE,
      OTEL_EXPORTER_OTLP_ENDPOINT: 'http://localhost:4318',
      LOG_FORMAT: 'json',
      METRICS_PORT: '0',
    });
    expect(env.OTEL_EXPORTER_OTLP_ENDPOINT).toBe('http://localhost:4318');
    expect(env.LOG_FORMAT).toBe('json');
    expect(env.METRICS_PORT).toBe(0);
  });

  it.each([
    ['OTEL_EXPORTER_OTLP_ENDPOINT', 'not a url'],
    ['LOG_FORMAT', 'xml'],
    ['METRICS_PORT', '70000'],
  ])('rejects %s=%s', (key, value) => {
    expect(() => loadEnv(ApiEnv, { ...BASE, [key]: value })).toThrow(key);
  });
});

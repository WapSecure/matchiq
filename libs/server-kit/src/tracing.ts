// Kept apart from the main entry: it must load before Nest, pg and ioredis.
export * from './lib/telemetry/tracing';

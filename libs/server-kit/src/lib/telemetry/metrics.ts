import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import {
  collectDefaultMetrics,
  Counter,
  Gauge,
  Histogram,
  Registry,
} from 'prom-client';
import { METRICS } from './telemetry.constants';

export { Counter, Gauge, Histogram, Registry };

export const METRICS_REGISTRY = Symbol('METRICS_REGISTRY');

/**
 * One registry per application instance (never the prom-client global), so
 * several apps in one test process do not collide. Every series carries
 * `service`; process and Node runtime series come with it.
 */
export const createMetricsRegistry = (service: string): Registry => {
  const registry = new Registry();
  registry.setDefaultLabels({ service });
  collectDefaultMetrics({ register: registry });
  return registry;
};

export interface MetricsServer {
  readonly port: number;
  close(): Promise<void>;
}

/**
 * Serves `GET /metrics` on its own listener, apart from the public API port,
 * so the reverse proxy never exposes it (docs/operations/OBSERVABILITY.md).
 */
export const startMetricsServer = async (
  registry: Registry,
  options: { readonly host: string; readonly port: number },
): Promise<MetricsServer> => {
  const server: Server = createServer((req, res) => {
    if (req.method !== 'GET' || req.url !== METRICS.contentPath) {
      res.writeHead(404).end(METRICS.notFound);
      return;
    }
    registry.metrics().then(
      (body) => {
        res.writeHead(200, { 'content-type': registry.contentType });
        res.end(body);
      },
      () => res.writeHead(500).end(),
    );
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(options.port, options.host, resolve);
  });
  server.unref();
  return {
    port: (server.address() as AddressInfo).port,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
};

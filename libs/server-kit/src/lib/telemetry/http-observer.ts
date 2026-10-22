import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Counter, Histogram, METRICS_REGISTRY, type Registry } from './metrics';
import {
  ACCESS_LOG,
  ACTOR_REQUEST_FIELD,
  METRICS,
  QUIET_ROUTE_PATTERN,
  UNMATCHED_ROUTE,
} from './telemetry.constants';

export const REQUEST_OBSERVER = Symbol('REQUEST_OBSERVER');

/** Called once per finished HTTP request by the request-context middleware. */
export interface RequestObserver {
  finished(req: Request, res: Response, durationMs: number): void;
}

/** The route template, never the raw path: ids and queries stay out of labels. */
export const routeOf = (req: Request): string => {
  const route = (req as { route?: { path?: unknown } }).route?.path;
  return typeof route === 'string'
    ? `${req.baseUrl ?? ''}${route}`
    : UNMATCHED_ROUTE;
};

const orgOf = (req: Request): string | undefined =>
  (req as unknown as Record<string, { orgId?: string } | undefined>)[
    ACTOR_REQUEST_FIELD
  ]?.orgId;

/** RED metrics per route and one structured access line per request. */
@Injectable()
export class HttpObserver implements RequestObserver {
  private readonly logger = new Logger(ACCESS_LOG.context);
  private readonly requests: Counter<'method' | 'route' | 'status'>;
  private readonly duration: Histogram<'method' | 'route'>;

  constructor(@Inject(METRICS_REGISTRY) registry: Registry) {
    this.requests = new Counter({
      name: `${METRICS.prefix}http_requests_total`,
      help: 'HTTP requests by method, route template and status code',
      labelNames: ['method', 'route', 'status'],
      registers: [registry],
    });
    this.duration = new Histogram({
      name: `${METRICS.prefix}http_request_duration_seconds`,
      help: 'HTTP request latency by method and route template (SSE streams last for the connection)',
      labelNames: ['method', 'route'],
      buckets: [...METRICS.durationBuckets],
      registers: [registry],
    });
  }

  finished(req: Request, res: Response, durationMs: number): void {
    const route = routeOf(req);
    const status = res.statusCode;
    this.requests.inc({ method: req.method, route, status: String(status) });
    this.duration.observe({ method: req.method, route }, durationMs / 1_000);
    const line = {
      msg: ACCESS_LOG.message,
      method: req.method,
      route,
      status,
      durationMs: Math.round(durationMs),
      orgId: orgOf(req),
    };
    if (QUIET_ROUTE_PATTERN.test(route)) this.logger.debug(line);
    else this.logger.log(line);
  }
}

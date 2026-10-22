import {
  Controller,
  Get,
  type INestApplication,
  Module,
  Param,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { configureHttpApp } from '../bootstrap/configure-http-app';
import { HttpKitModule } from '../http/http-kit.module';
import { currentLogContext } from './log-context';
import {
  Counter,
  METRICS_REGISTRY,
  Registry,
  startMetricsServer,
} from './metrics';
import { TelemetryModule } from './telemetry.module';

@Controller('fixtures')
class ProbeController {
  @Get(':fixtureId/state')
  state(@Param('fixtureId') fixtureId: string) {
    return { fixtureId, context: currentLogContext() };
  }
}

@Module({
  imports: [
    TelemetryModule.forRoot({ service: 'matchiq-probe' }),
    HttpKitModule,
  ],
  controllers: [ProbeController],
})
class ProbeModule {}

describe('telemetry module', () => {
  let app: INestApplication;
  let registry: Registry;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ProbeModule],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    configureHttpApp(app, { corsOrigins: [] });
    await app.init();
    registry = app.get(METRICS_REGISTRY);
  });

  afterAll(() => app.close());

  it('records RED metrics under the route template, never the raw path', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/fixtures/fx_secret_1/state')
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/v1/fixtures/fx_secret_2/state')
      .expect(200);
    await request(app.getHttpServer()).get('/api/v1/nowhere/123').expect(404);
    const text = await registry.metrics();
    expect(text).toContain(
      'matchiq_http_requests_total{method="GET",route="/api/v1/fixtures/:fixtureId/state",status="200",service="matchiq-probe"} 2',
    );
    expect(text).toContain(
      'matchiq_http_requests_total{method="GET",route="unmatched",status="404",service="matchiq-probe"} 1',
    );
    expect(text).toContain(
      'matchiq_http_request_duration_seconds_count{method="GET",route="/api/v1/fixtures/:fixtureId/state",service="matchiq-probe"} 2',
    );
    expect(text).not.toMatch(/fx_secret|nowhere\/123/);
  });

  it('exposes process and Node runtime series with the service label', async () => {
    const text = await registry.metrics();
    expect(text).toMatch(
      /process_cpu_seconds_total\{service="matchiq-probe"\}/,
    );
    expect(text).toContain('nodejs_eventloop_lag_seconds');
  });

  it('gives handlers a log context with the request id, correlation id and fixture', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/fixtures/fx_ctx/state')
      .set('x-request-id', 'req-abcdef12')
      .set('x-correlation-id', 'corr-abcdef12')
      .expect(200);
    expect(res.body.context).toEqual({
      requestId: 'req-abcdef12',
      correlationId: 'corr-abcdef12',
      fixtureId: 'fx_ctx',
    });
  });

  it('defaults the correlation id to the request id', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/fixtures/fx_ctx/state')
      .expect(200);
    expect(res.body.context.correlationId).toBe(res.headers['x-request-id']);
  });
});

describe('metrics listener', () => {
  it('serves the registry as Prometheus text on GET /metrics only', async () => {
    const registry = new Registry();
    new Counter({
      name: 'matchiq_probe_total',
      help: 'probe',
      registers: [registry],
    }).inc(3);
    const server = await startMetricsServer(registry, {
      host: '127.0.0.1',
      port: 0,
    });
    try {
      const base = `http://127.0.0.1:${server.port}`;
      const ok = await fetch(`${base}/metrics`);
      expect(ok.status).toBe(200);
      expect(ok.headers.get('content-type')).toContain('text/plain');
      const body = await ok.text();
      expect(body).toContain('# HELP matchiq_probe_total probe');
      expect(body).toContain('matchiq_probe_total 3');
      expect((await fetch(`${base}/`)).status).toBe(404);
      expect((await fetch(`${base}/metrics`, { method: 'POST' })).status).toBe(
        404,
      );
    } finally {
      await server.close();
    }
  });
});

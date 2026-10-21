import { type INestApplication, Injectable } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { configureHttpApp } from '../bootstrap/configure-http-app';
import { HealthModule, type HealthModuleConfig } from './health.module';
import { HealthService } from './health.service';
import type { HealthCheckResult, HealthIndicator } from './health.types';

@Injectable()
class OkIndicator implements HealthIndicator {
  readonly name = 'config';
  async check(): Promise<HealthCheckResult> {
    return { status: 'ok' };
  }
}

@Injectable()
class FailingIndicator implements HealthIndicator {
  readonly name = 'postgres';
  async check(): Promise<HealthCheckResult> {
    throw new Error('connection refused');
  }
}

@Injectable()
class HangingIndicator implements HealthIndicator {
  readonly name = 'redis';
  check(): Promise<HealthCheckResult> {
    return new Promise(() => undefined);
  }
}

const createApp = async (indicators: HealthModuleConfig['indicators']) => {
  const moduleRef = await Test.createTestingModule({
    imports: [
      HealthModule.forRoot({ service: 'api', version: '0.1.0', indicators }),
    ],
  }).compile();
  const app = moduleRef.createNestApplication({ logger: false });
  configureHttpApp(app, { corsOrigins: [] });
  await app.init();
  return app;
};

describe('HealthModule', () => {
  let app: INestApplication;
  afterEach(() => app.close());

  it('reports liveness without running dependency checks', async () => {
    app = await createApp([FailingIndicator]);
    const res = await request(app.getHttpServer()).get('/api/v1/health/live');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: 'ok',
      service: 'api',
      version: '0.1.0',
      checks: {},
    });
  });

  it('is ready when every indicator is ok', async () => {
    app = await createApp([OkIndicator]);
    const res = await request(app.getHttpServer()).get('/api/v1/health/ready');
    expect(res.status).toBe(200);
    expect(res.body.checks).toEqual({ config: { status: 'ok' } });
  });

  it('returns 503 with the failing dependency named', async () => {
    app = await createApp([OkIndicator, FailingIndicator]);
    const res = await request(app.getHttpServer()).get('/api/v1/health/ready');
    expect(res.status).toBe(503);
    expect(res.body.status).toBe('unavailable');
    expect(res.body.checks.postgres.status).toBe('unavailable');
    expect(JSON.stringify(res.body)).not.toContain('connection refused');
  });

  it('times out hanging checks', async () => {
    app = await createApp([HangingIndicator]);
    const report = await app.get(HealthService).readiness(20);
    expect(report.checks['redis']).toEqual({
      status: 'unavailable',
      detail: 'Health check timed out',
    });
  });
});

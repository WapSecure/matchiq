import {
  type DynamicModule,
  type INestApplication,
  Module,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createDatabase, type DatabaseHandle } from '@matchiq/db';
import {
  configureHttpApp,
  HealthModule,
  type HealthCheckResult,
  type HealthIndicator,
} from '@matchiq/server-kit';
import request from 'supertest';
import {
  PostgresHealthIndicator,
  RedisHealthIndicator,
} from './health.indicators';
import type { RedisConnections } from './redis-connections';
import { DATABASE, REDIS } from './tokens';

jest.setTimeout(15_000);

// Port 1 is reserved and closed, so connections are refused immediately.
const DEAD_POSTGRES = 'postgresql://matchiq:x@127.0.0.1:1/matchiq';
// A real ioredis client keeps a connect timer alive after disconnect, which
// would hold the Jest worker open; a rejecting PING exercises the same path.
const deadRedis = {
  bus: { ping: () => Promise.reject(new Error('ECONNREFUSED')) },
  close: async () => undefined,
} as unknown as RedisConnections;

class HealthyIndicator implements HealthIndicator {
  readonly name = 'always-ok';
  check = async (): Promise<HealthCheckResult> => ({ status: 'ok' });
}

@Module({})
class DeadDependencies {}

describe('Dependency health indicators', () => {
  let app: INestApplication;
  let database: DatabaseHandle;
  let redis: RedisConnections;

  beforeAll(async () => {
    database = createDatabase({ url: DEAD_POSTGRES });
    redis = deadRedis;
    const dependencies: DynamicModule = {
      module: DeadDependencies,
      providers: [
        { provide: DATABASE, useValue: database },
        { provide: REDIS, useValue: redis },
      ],
      exports: [DATABASE, REDIS],
    };
    const moduleRef = await Test.createTestingModule({
      imports: [
        HealthModule.forRoot({
          service: 'matchiq-api',
          version: 'test',
          imports: [dependencies],
          indicators: [
            HealthyIndicator,
            PostgresHealthIndicator,
            RedisHealthIndicator,
          ],
        }),
      ],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    configureHttpApp(app, { corsOrigins: [] });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await database.close();
    await redis.close();
  });

  it('answers readiness 503 naming each unreachable dependency', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health/ready');
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({
      status: 'unavailable',
      checks: {
        'always-ok': { status: 'ok' },
        postgres: { status: 'unavailable', detail: 'unreachable' },
        redis: { status: 'unavailable' },
      },
    });
  });

  it('keeps liveness green while dependencies are down', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health/live');
    expect(res.status).toBe(200);
  });
});

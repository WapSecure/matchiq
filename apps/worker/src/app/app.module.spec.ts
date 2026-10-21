import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { WorkerEnv, loadEnv } from '@matchiq/config';
import { configureHttpApp } from '@matchiq/server-kit';
import request from 'supertest';
import { AppModule } from './app.module';

const env = loadEnv(WorkerEnv, {
  DATABASE_URL: 'postgresql://matchiq:matchiq@localhost:5432/matchiq',
  REDIS_URL: 'redis://localhost:6379',
  AGENTS_SERVICE_TOKEN: 't'.repeat(32),
});

describe('Worker AppModule', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule.forRoot(env)],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    configureHttpApp(app, { corsOrigins: [] });
    await app.init();
  });

  afterAll(() => app.close());

  it('serves liveness for container probes', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health/live');
    expect(res.status).toBe(200);
    expect(res.body.service).toBe('matchiq-worker');
  });

  it('defaults AI to disabled so replay never depends on a model', () => {
    expect(env.AI_ENABLED).toBe(false);
  });
});

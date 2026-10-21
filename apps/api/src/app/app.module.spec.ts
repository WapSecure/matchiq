import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ApiEnv, loadEnv } from '@matchiq/config';
import { APP_ENV, configureHttpApp } from '@matchiq/server-kit';
import request from 'supertest';
import { AppModule } from './app.module';

const env = loadEnv(ApiEnv, {
  APP_VERSION: '1.2.3',
  DATABASE_URL: 'postgresql://matchiq:matchiq@localhost:5432/matchiq',
  REDIS_URL: 'redis://localhost:6379',
  OPERATOR_API_KEY: 'o'.repeat(32),
});

describe('API AppModule', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule.forRoot(env)],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    configureHttpApp(app, { corsOrigins: env.CORS_ALLOWED_ORIGINS });
    await app.init();
  });

  afterAll(() => app.close());

  it('serves liveness under the versioned prefix', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health/live');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      service: 'matchiq-api',
      version: '1.2.3',
    });
  });

  it('answers unknown routes with problem details', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/nope');
    expect(res.status).toBe(404);
    expect(res.body.type).toBe('urn:matchiq:problem:not-found');
  });

  it('exposes frozen configuration', () => {
    const provided = app.get<ApiEnv>(APP_ENV);
    expect(Object.isFrozen(provided)).toBe(true);
  });
});

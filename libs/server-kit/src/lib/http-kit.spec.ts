import {
  Body,
  Controller,
  Get,
  type INestApplication,
  Module,
  NotFoundException,
  Post,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { z } from 'zod';
import { configureHttpApp } from './bootstrap/configure-http-app';
import { PROBLEM_CONTENT_TYPE, REQUEST_ID_HEADER } from './constants';
import { HttpKitModule } from './http/http-kit.module';
import { ProblemException } from './http/problem.exception';
import { ZodValidationPipe } from './http/zod-validation.pipe';

const Payload = z.strictObject({ name: z.string().min(1) });

@Controller('probe')
class ProbeController {
  @Get('missing')
  missing(): never {
    throw new NotFoundException('Fixture not found');
  }

  @Get('conflict')
  conflict(): never {
    throw new ProblemException({
      status: 409,
      title: 'Event conflict',
      detail: 'ev_1 was already stored with a different body',
      slug: 'event-conflict',
      errors: [{ path: '$.events.0', message: 'changed body' }],
      headers: { 'x-probe': 'yes' },
    });
  }

  @Get('boom')
  boom(): never {
    throw new Error('database password leaked here');
  }

  @Post()
  create(@Body(new ZodValidationPipe(Payload)) body: z.infer<typeof Payload>) {
    return body;
  }
}

@Module({ imports: [HttpKitModule], controllers: [ProbeController] })
class ProbeModule {}

describe('HTTP baseline', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ProbeModule],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    configureHttpApp(app, { corsOrigins: [] });
    await app.init();
  });

  afterAll(() => app.close());

  it('renders HTTP exceptions as problem details with a generic title', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/probe/missing');
    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toContain(PROBLEM_CONTENT_TYPE);
    expect(res.body).toMatchObject({
      type: 'urn:matchiq:problem:not-found',
      title: 'Not found',
      status: 404,
      instance: '/api/v1/probe/missing',
    });
  });

  it('never echoes framework messages for unknown routes', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/no/such/route');
    expect(res.status).toBe(404);
    expect(res.body.title).toBe('Not found');
    expect(JSON.stringify(res.body)).not.toMatch(/Cannot GET/);
  });

  it('answers malformed JSON with a 400 that hides parser output', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/probe')
      .set('Content-Type', 'application/json')
      .send('{"name": ');
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      type: 'urn:matchiq:problem:bad-request',
      title: 'Malformed request',
    });
    expect(res.body.detail).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toMatch(/JSON|token|position/i);
  });

  it('lets allowed browser origins read Retry-After and the request id', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ProbeModule],
    }).compile();
    const cors = moduleRef.createNestApplication({ logger: false });
    configureHttpApp(cors, { corsOrigins: ['https://web.example'] });
    await cors.init();
    const res = await request(cors.getHttpServer())
      .get('/api/v1/probe/missing')
      .set('Origin', 'https://web.example');
    expect(res.headers['access-control-expose-headers']).toBe(
      'Retry-After,X-Request-Id',
    );
    await cors.close();
  });

  it('renders problem exceptions with detail, errors and headers', async () => {
    const res = await request(app.getHttpServer()).get(
      '/api/v1/probe/conflict',
    );
    expect(res.status).toBe(409);
    expect(res.headers['x-probe']).toBe('yes');
    expect(res.body).toMatchObject({
      type: 'urn:matchiq:problem:event-conflict',
      title: 'Event conflict',
      detail: 'ev_1 was already stored with a different body',
      errors: [{ path: '$.events.0', message: 'changed body' }],
    });
  });

  it('hides internal error details from clients', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/probe/boom');
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain('password');
  });

  it('returns field-level errors for invalid bodies', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/probe')
      .send({ name: '', extra: 1 });
    expect(res.status).toBe(422);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: '$.name' })]),
    );
  });

  it('echoes a valid inbound request id', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/probe/missing')
      .set(REQUEST_ID_HEADER, 'req-12345678');
    expect(res.headers[REQUEST_ID_HEADER]).toBe('req-12345678');
    expect(res.body.requestId).toBe('req-12345678');
  });

  it('replaces malformed request ids', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/probe/missing')
      .set(REQUEST_ID_HEADER, '<script>');
    expect(res.headers[REQUEST_ID_HEADER]).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('sets security headers', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/probe/missing');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['content-security-policy']).toBe(
      "default-src 'none';base-uri 'none';form-action 'none';frame-ancestors 'none'",
    );
    expect(res.headers['strict-transport-security']).toMatch(/max-age=\d+/);
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['cross-origin-resource-policy']).toBe('same-origin');
  });

  it('denies cross-origin browser calls without an allowlist', async () => {
    const res = await request(app.getHttpServer())
      .options('/api/v1/probe/missing')
      .set('Origin', 'https://evil.example')
      .set('Access-Control-Request-Method', 'GET');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});

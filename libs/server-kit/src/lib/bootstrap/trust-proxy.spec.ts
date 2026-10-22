import {
  Controller,
  Get,
  type INestApplication,
  Module,
  Req,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Request } from 'express';
import request from 'supertest';
import { configureHttpApp, type HttpAppOptions } from './configure-http-app';

@Controller('ip')
class IpController {
  @Get()
  ip(@Req() req: Request): { ip: string | undefined } {
    return { ip: req.ip };
  }
}

@Module({ controllers: [IpController] })
class IpModule {}

const boot = async (
  trustProxy: HttpAppOptions['trustProxy'],
): Promise<INestApplication> => {
  const moduleRef = await Test.createTestingModule({
    imports: [IpModule],
  }).compile();
  const app = moduleRef.createNestApplication({ logger: false });
  configureHttpApp(app, { corsOrigins: [], trustProxy });
  await app.init();
  return app;
};

const ipSeen = async (
  app: INestApplication,
  forwardedFor: string,
): Promise<string> => {
  const res = await request(app.getHttpServer())
    .get('/api/v1/ip')
    .set('x-forwarded-for', forwardedFor);
  return (res.body as { ip: string }).ip;
};

describe('configureHttpApp trust proxy', () => {
  it('ignores X-Forwarded-For by default', async () => {
    const app = await boot(undefined);
    expect(await ipSeen(app, '203.0.113.7')).not.toBe('203.0.113.7');
    await app.close();
  });

  it('takes the client from the last trusted hop, so a spoofed header is ignored', async () => {
    const app = await boot(1);
    expect(await ipSeen(app, '203.0.113.7')).toBe('203.0.113.7');
    expect(await ipSeen(app, '6.6.6.6, 198.51.100.9')).toBe('198.51.100.9');
    await app.close();
  });

  it('trusts only the listed proxy addresses', async () => {
    const app = await boot(['loopback']);
    expect(await ipSeen(app, '6.6.6.6, 198.51.100.9')).toBe('198.51.100.9');
    await app.close();
  });
});

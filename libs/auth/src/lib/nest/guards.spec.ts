import 'reflect-metadata';
import {
  Controller,
  Get,
  type INestApplication,
  Module,
  Param,
  Post,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import type { Principal } from '@matchiq/access';
import { AuthEnv, loadEnv } from '@matchiq/config';
import {
  configureHttpApp,
  HttpKitModule,
  PublicRoute,
} from '@matchiq/server-kit';
import request from 'supertest';
import { startTestIssuer, type TestIssuer } from '../../testing';
import type { StreamTickets } from '../stream-tickets';
import { AuthModule } from './auth.module';
import {
  AcceptsStreamTicket,
  CurrentPrincipal,
  RequirePermission,
} from './decorators';
import {
  type AccessDenial,
  AuthenticationGuard,
  PermissionGuard,
} from './guards';
import { ACCESS_DENIED_LISTENER, STREAM_TICKETS } from './tokens';

const OPERATOR_KEY = 'o'.repeat(40);

@Controller('probe')
class ProbeController {
  @Get('public')
  @PublicRoute()
  open(): string {
    return 'ok';
  }

  @Get('read')
  @RequirePermission('fixtures:read')
  read(@CurrentPrincipal() principal: Principal) {
    return { orgId: principal.orgId, kind: principal.kind };
  }

  @Post('ingest')
  @RequirePermission('events:ingest')
  ingest(): string {
    return 'ingested';
  }

  @Get('undeclared')
  undeclared(): string {
    return 'should never answer';
  }

  @Get(':fixtureId/stream')
  @RequirePermission('fixtures:read')
  @AcceptsStreamTicket('fixtureId')
  stream(
    @Param('fixtureId') fixtureId: string,
    @CurrentPrincipal() p: Principal,
  ) {
    return { fixtureId, userId: p.userId };
  }
}

describe('AuthenticationGuard and PermissionGuard', () => {
  let issuer: TestIssuer;
  let app: INestApplication;
  const denials: AccessDenial[] = [];

  const boot = async (env: Record<string, string>) => {
    @Module({
      imports: [HttpKitModule, AuthModule.forRoot(loadEnv(AuthEnv, env))],
      controllers: [ProbeController],
      providers: [
        { provide: APP_GUARD, useClass: AuthenticationGuard },
        { provide: APP_GUARD, useClass: PermissionGuard },
        {
          provide: ACCESS_DENIED_LISTENER,
          useValue: { onDenied: (d: AccessDenial) => denials.push(d) },
        },
      ],
    })
    class ProbeModule {}
    const ref = await Test.createTestingModule({
      imports: [ProbeModule],
    }).compile();
    const nest = ref.createNestApplication({ logger: false });
    configureHttpApp(nest, { corsOrigins: [] });
    await nest.init();
    return nest;
  };

  beforeAll(async () => {
    issuer = await startTestIssuer();
    app = await boot({
      OIDC_ISSUER_URL: issuer.issuer,
      OIDC_AUDIENCE: issuer.audience,
      STREAM_TICKET_SECRET: 't'.repeat(32),
      AUTH_ANONYMOUS_DEMO_ENABLED: 'true',
      AUTH_ANONYMOUS_ORG_ID: 'org_demo',
      AUTH_OPERATOR_KEY_ENABLED: 'true',
      OPERATOR_API_KEY: OPERATOR_KEY,
    });
  });
  afterAll(async () => {
    await app.close();
    await issuer.close();
  });

  const http = () => request(app.getHttpServer());
  const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

  it('lets public routes through without credentials', async () => {
    await http().get('/api/v1/probe/public').expect(200);
  });

  it('admits a request without credentials as the anonymous demo tenant', async () => {
    const res = await http().get('/api/v1/probe/read').expect(200);
    expect(res.body).toEqual({ orgId: 'org_demo', kind: 'anonymous' });
  });

  it('never downgrades a bad token to anonymous', async () => {
    const res = await http()
      .get('/api/v1/probe/read')
      .set(
        bearer(await issuer.tokenFor(['viewer'], 'org_a', { expiresIn: -600 })),
      )
      .expect(401);
    expect(res.headers['content-type']).toContain('application/problem+json');
    expect(res.body).toMatchObject({
      type: 'urn:matchiq:problem:unauthorized',
      detail: 'The access token has expired',
    });
    expect(res.headers['www-authenticate']).toContain('error="invalid_token"');
  });

  it('takes the organisation from the token', async () => {
    const res = await http()
      .get('/api/v1/probe/read')
      .set(bearer(await issuer.tokenFor(['viewer'], 'org_northbank')))
      .expect(200);
    expect(res.body).toEqual({ orgId: 'org_northbank', kind: 'user' });
  });

  it('answers 403 with insufficient_scope and reports the denial', async () => {
    denials.length = 0;
    const res = await http()
      .post('/api/v1/probe/ingest')
      .set(bearer(await issuer.tokenFor(['viewer'], 'org_a')))
      .expect(403);
    expect(res.body).toMatchObject({
      type: 'urn:matchiq:problem:forbidden',
      detail: 'Requires the events:ingest permission',
    });
    expect(res.headers['www-authenticate']).toContain('scope="events:ingest"');
    expect(denials).toEqual([
      expect.objectContaining({ permission: 'events:ingest', method: 'POST' }),
    ]);
  });

  it('refuses anonymous callers on privileged routes', async () => {
    await http().post('/api/v1/probe/ingest').expect(403);
  });

  it('denies routes that declare no permission, even to powerful roles', async () => {
    await http()
      .get('/api/v1/probe/undeclared')
      .set(bearer(await issuer.tokenFor(['developer', 'producer'], 'org_a')))
      .expect(403);
  });

  it('admits the operator key only as the configured developer principal', async () => {
    await http()
      .post('/api/v1/probe/ingest')
      .set(bearer(OPERATOR_KEY))
      .expect(201);
    await http()
      .post('/api/v1/probe/ingest')
      .set(bearer('x'.repeat(40)))
      .expect(401);
  });

  it('accepts a stream ticket on the bound stream only', async () => {
    const tickets = app.get<StreamTickets>(STREAM_TICKETS);
    const principal = {
      kind: 'user' as const,
      userId: 'u-9',
      orgId: 'org_a',
      roles: ['viewer' as const],
      scopes: [],
      permissions: ['fixtures:read' as const],
    };
    const { ticket } = await tickets.issue(principal, 'fx_1_s1');
    const ok = await http()
      .get(`/api/v1/probe/fx_1_s1/stream?ticket=${ticket}`)
      .expect(200);
    expect(ok.body).toEqual({ fixtureId: 'fx_1_s1', userId: 'u-9' });
    const other = await http()
      .get(`/api/v1/probe/fx_1_s2/stream?ticket=${ticket}`)
      .expect(401);
    expect(other.body.instance).toBe('/api/v1/probe/fx_1_s2/stream');
    const elsewhere = await http()
      .get(`/api/v1/probe/read?ticket=${ticket}`)
      .expect(200);
    expect(elsewhere.body.kind).toBe('anonymous');
  });

  it('rejects tokens when no issuer is configured', async () => {
    const keyOnly = await boot({
      STREAM_TICKET_SECRET: 't'.repeat(32),
      AUTH_ANONYMOUS_DEMO_ENABLED: 'true',
    });
    try {
      const res = await request(keyOnly.getHttpServer())
        .get('/api/v1/probe/read')
        .set(bearer(await issuer.tokenFor(['viewer'], 'org_a')))
        .expect(401);
      expect(res.body.detail).toBe(
        'This API is not configured for bearer tokens',
      );
    } finally {
      await keyOnly.close();
    }
  });

  it('answers 401 without an error code when nothing was sent and anonymous is off', async () => {
    const closed = await boot({
      OIDC_ISSUER_URL: issuer.issuer,
      OIDC_AUDIENCE: issuer.audience,
      STREAM_TICKET_SECRET: 't'.repeat(32),
    });
    try {
      const res = await request(closed.getHttpServer())
        .get('/api/v1/probe/read')
        .expect(401);
      expect(res.headers['www-authenticate']).toBe('Bearer realm="matchiq"');
    } finally {
      await closed.close();
    }
  });
});

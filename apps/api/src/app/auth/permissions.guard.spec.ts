import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { ApiEnv } from '@matchiq/config';
import type { Permission } from '@matchiq/contracts';
import { ProblemException } from '@matchiq/server-kit';
import {
  type Actor,
  type ActorResolution,
  type ActorResolver,
  OperatorKeyActorResolver,
} from './actor';
import { PermissionsGuard } from './permissions.guard';

const KEY = 'k'.repeat(40);

const reviewer: Actor = {
  type: 'OPERATOR',
  id: 'analyst-1',
  orgId: 'org_demo',
  permissions: new Set<Permission>(['audit:read']),
};

const contextFor = (request: Record<string, unknown>): ExecutionContext =>
  ({
    getHandler: () => () => undefined,
    switchToHttp: () => ({ getRequest: () => request }),
  }) as unknown as ExecutionContext;

const guardWith = (resolution: ActorResolution, required: Permission) => {
  const reflector = { get: () => required } as unknown as Reflector;
  const resolver: ActorResolver = { resolve: () => resolution };
  return new PermissionsGuard(reflector, resolver);
};

const problemOf = (fn: () => unknown) => {
  try {
    fn();
    return null;
  } catch (error) {
    if (!(error instanceof ProblemException)) throw error;
    return { status: error.getStatus(), slug: error.problem.slug };
  }
};

describe('PermissionsGuard', () => {
  it('answers 401 when no credentials are presented', () => {
    const guard = guardWith({ kind: 'anonymous' }, 'editorial:publish');
    expect(problemOf(() => guard.canActivate(contextFor({})))).toEqual({
      status: 401,
      slug: 'unauthorized',
    });
  });

  it('answers 401 for invalid credentials', () => {
    const guard = guardWith({ kind: 'invalid' }, 'editorial:publish');
    expect(problemOf(() => guard.canActivate(contextFor({})))?.status).toBe(
      401,
    );
  });

  it('answers 403 when the actor lacks the permission', () => {
    const guard = guardWith(
      { kind: 'actor', actor: reviewer },
      'editorial:publish',
    );
    expect(problemOf(() => guard.canActivate(contextFor({})))).toEqual({
      status: 403,
      slug: 'forbidden',
    });
  });

  it('admits an actor holding the permission and exposes it to the handler', () => {
    const request: Record<string, unknown> = {};
    const guard = guardWith({ kind: 'actor', actor: reviewer }, 'audit:read');
    expect(guard.canActivate(contextFor(request))).toBe(true);
    expect(request['matchiqActor']).toBe(reviewer);
  });
});

describe('OperatorKeyActorResolver', () => {
  const resolver = new OperatorKeyActorResolver({
    OPERATOR_API_KEY: KEY,
    DEMO_ORG_ID: 'org_demo',
  } as ApiEnv);
  const headers = (authorization?: string) => ({
    header: (name: string) =>
      name === 'authorization' ? authorization : undefined,
  });

  it('maps the shared key to the operator with every permission', () => {
    const resolution = resolver.resolve(headers(`Bearer ${KEY}`));
    expect(resolution.kind).toBe('actor');
    if (resolution.kind === 'actor') {
      expect(resolution.actor).toMatchObject({
        id: 'operator',
        orgId: 'org_demo',
      });
      expect(resolution.actor.permissions.has('editorial:admin')).toBe(true);
    }
  });

  it('distinguishes missing from wrong credentials', () => {
    expect(resolver.resolve(headers()).kind).toBe('anonymous');
    expect(resolver.resolve(headers(`Bearer ${'x'.repeat(40)}`)).kind).toBe(
      'invalid',
    );
  });
});

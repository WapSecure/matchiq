import 'reflect-metadata';
import { PATH_METADATA } from '@nestjs/common/constants';
import { Permission } from '@matchiq/access';
import { ANY_PRINCIPAL, METADATA } from '@matchiq/auth';
import { PUBLIC_ROUTE_METADATA } from '@matchiq/server-kit';
import { API_CONTROLLERS } from '../app.module';

type Handler = (...args: unknown[]) => unknown;

const routesOf = (controller: { prototype: object; name: string }) =>
  Object.getOwnPropertyNames(controller.prototype)
    .filter((name) => name !== 'constructor')
    .map((name) => ({
      route: `${controller.name}.${name}`,
      handler: (controller.prototype as Record<string, Handler>)[name],
    }))
    .filter(
      ({ handler }) =>
        typeof handler === 'function' &&
        Reflect.getMetadata(PATH_METADATA, handler) !== undefined,
    );

const declarationOf = (
  controller: object,
  handler: Handler,
): string | undefined => {
  if (
    Reflect.getMetadata(PUBLIC_ROUTE_METADATA, handler) === true ||
    Reflect.getMetadata(PUBLIC_ROUTE_METADATA, controller) === true
  )
    return 'public';
  return (
    Reflect.getMetadata(METADATA.permission, handler) ??
    Reflect.getMetadata(METADATA.permission, controller)
  );
};

/** Deny by default is enforced at runtime; this makes a missing declaration fail CI instead. */
describe('route permissions (ADR-0015)', () => {
  const routes = API_CONTROLLERS.flatMap((controller) =>
    routesOf(controller).map((r) => ({ ...r, controller })),
  );

  it('finds every API route', () => {
    expect(routes.length).toBeGreaterThanOrEqual(18);
  });

  it.each(routes.map((r) => [r.route, r] as const))(
    '%s declares exactly one known permission',
    (_name, { controller, handler }) => {
      const declared = declarationOf(controller, handler);
      expect(declared).toBeDefined();
      expect(
        declared === ANY_PRINCIPAL || Permission.safeParse(declared).success,
      ).toBe(true);
    },
  );
});

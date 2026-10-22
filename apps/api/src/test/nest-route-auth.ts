import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import type { INestApplication } from '@nestjs/common';
import { MetadataScanner, ModulesContainer } from '@nestjs/core';
import { ANY_PRINCIPAL, METADATA } from '@matchiq/auth';
import { PUBLIC_ROUTE_METADATA } from '@matchiq/server-kit';
import { OPENAPI_PATTERNS } from '../app/openapi/openapi.constants';

type Handler = (...args: unknown[]) => unknown;

const joinPath = (...parts: unknown[]): string =>
  `/${parts
    .map((p) => (Array.isArray(p) ? String(p[0] ?? '') : String(p ?? '')))
    .flatMap((p) => p.split('/'))
    .filter(Boolean)
    .join('/')}`;

const toOpenApiPath = (path: string): string =>
  path
    .replace(OPENAPI_PATTERNS.nestParam, '{$1}')
    .replace(OPENAPI_PATTERNS.escapedColon, ':');

const authOf = (controller: object, handler: Handler): string => {
  const isPublic =
    Reflect.getMetadata(PUBLIC_ROUTE_METADATA, handler) ??
    Reflect.getMetadata(PUBLIC_ROUTE_METADATA, controller);
  if (isPublic === true) return 'public';
  const permission = Reflect.getMetadata(METADATA.permission, handler) as
    string | undefined;
  if (permission === ANY_PRINCIPAL) return 'authenticated';
  return permission ?? 'undeclared';
};

/**
 * `METHOD /path` → declared auth for every controller handler in the app,
 * read from the same decorator metadata the guards enforce.
 */
const controllerRoutes = (
  controller: Handler,
  scanner: MetadataScanner,
): [string, string][] => {
  const base: unknown = Reflect.getMetadata(PATH_METADATA, controller);
  const proto = controller.prototype as Record<string, Handler>;
  return scanner.getAllMethodNames(proto).flatMap((name) => {
    const handler = proto[name];
    if (!handler) return [];
    const method = Reflect.getMetadata(METHOD_METADATA, handler) as
      RequestMethod | undefined;
    const path: unknown = Reflect.getMetadata(PATH_METADATA, handler);
    if (method === undefined || path === undefined) return [];
    const key = `${RequestMethod[method]} ${toOpenApiPath(joinPath(base, path))}`;
    return [[key, authOf(controller, handler)]];
  });
};

export const nestRouteAuth = (app: INestApplication): Map<string, string> => {
  const scanner = new MetadataScanner();
  const controllers = [...app.get(ModulesContainer).values()].flatMap(
    (module) => [...module.controllers.values()],
  );
  return new Map(
    controllers.flatMap((wrapper) => {
      const controller = wrapper.metatype as unknown as Handler | null;
      return controller ? controllerRoutes(controller, scanner) : [];
    }),
  );
};

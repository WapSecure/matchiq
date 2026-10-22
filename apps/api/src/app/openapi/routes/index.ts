import type { ApiRoute } from '../route-types';
import { EDITORIAL_ROUTES } from './editorial.routes';
import { FIXTURE_ROUTES } from './fixture.routes';
import { INTELLIGENCE_ROUTES } from './intelligence.routes';
import { PLATFORM_ROUTES } from './platform.routes';
import { REPLAY_ROUTES } from './replay.routes';

/** Every HTTP route the API serves. A new controller route must be added here. */
export const API_ROUTES: readonly ApiRoute[] = [
  ...FIXTURE_ROUTES,
  ...REPLAY_ROUTES,
  ...INTELLIGENCE_ROUTES,
  ...EDITORIAL_ROUTES,
  ...PLATFORM_ROUTES,
];

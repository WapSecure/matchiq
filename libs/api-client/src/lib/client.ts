import createClient, { type Client, type ClientOptions } from 'openapi-fetch';
import type { components, operations, paths } from '../generated/schema.js';

export type ApiPaths = paths;
export type ApiOperations = operations;
export type ApiSchemas = components['schemas'];
export type ApiClient = Client<paths>;

/**
 * A fetch client typed by `docs/api/openapi.json`. `baseUrl` includes the
 * version prefix, e.g. `https://api.example/api/v1`. Responses are typed, not
 * validated: callers that need runtime checks parse with `@matchiq/contracts`.
 */
export const createApiClient = (options: ClientOptions): ApiClient =>
  createClient<paths>(options);

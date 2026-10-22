import type { Permission } from '@matchiq/access';
import type { z } from 'zod';
import type { Tag } from './openapi.constants';
import type { ProblemRef } from './problem-catalog';

export type HttpMethod = 'get' | 'post';

export type RouteAuth =
  | { readonly kind: 'public' }
  | { readonly kind: 'operator' }
  | { readonly kind: 'permission'; readonly permission: Permission };

export type SuccessBody =
  | { readonly kind: 'json'; readonly schema: z.ZodType }
  | { readonly kind: 'stream' }
  | { readonly kind: 'raw'; readonly mediaType: string };

/**
 * One documented operation. The registry is the contract: `openapi.integration.spec.ts`
 * fails when a Nest route is missing here or an entry has no Nest route.
 */
export interface ApiRoute {
  readonly operationId: string;
  readonly method: HttpMethod;
  /** OpenAPI path below `/api/v1`, with `{param}` placeholders. */
  readonly path: string;
  readonly tag: Tag;
  readonly summary: string;
  readonly description?: string;
  readonly auth: RouteAuth;
  readonly params?: z.ZodObject;
  readonly query?: z.ZodObject;
  readonly body?: z.ZodType;
  /** Reads `Idempotency-Key` and may answer with `Idempotent-Replayed: true`. */
  readonly idempotent?: boolean;
  readonly success: {
    readonly status: number;
    readonly description: string;
    readonly body: SuccessBody;
  };
  /** Extra success statuses with the same body, e.g. 200 for an idempotent no-op. */
  readonly alsoSucceedsWith?: readonly {
    status: number;
    description: string;
  }[];
  readonly problems: readonly ProblemRef[];
  /** Registered only when a runtime flag enables it (the docs routes). */
  readonly conditional?: string;
}

export const json = (schema: z.ZodType): SuccessBody => ({
  kind: 'json',
  schema,
});

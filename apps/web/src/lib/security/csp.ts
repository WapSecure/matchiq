import { createHash, randomBytes } from 'node:crypto';
import {
  CSP_FLAGS,
  CSP_KEYWORDS as K,
  HASH_ALGORITHM,
  HTTPS_PROTOCOL,
  NONCE_BYTES,
} from '@/constants/security';
import { THEME_INIT_SCRIPT } from '@/lib/theme/theme-script';

export interface CspOptions {
  readonly nonce: string;
  /** Origin of `NEXT_PUBLIC_API_BASE_URL`; REST and SSE go there. */
  readonly apiOrigin?: string;
  /** Origin of the OIDC issuer when sign-in is configured. */
  readonly issuerOrigin?: string;
  /** `next dev`: React needs `eval` for stack frames and HMR uses a websocket. */
  readonly development: boolean;
}

/** CSP source for an inline script, e.g. `'sha256-…'`. */
export const inlineScriptHash = (source: string): string =>
  `'${HASH_ALGORITHM}-${createHash(HASH_ALGORITHM).update(source, 'utf8').digest('base64')}'`;

/** The theme bootstrap runs before hydration; its hash is derived from the exact source the layout renders. */
export const THEME_SCRIPT_HASH = inlineScriptHash(THEME_INIT_SCRIPT);

export const createNonce = (): string =>
  randomBytes(NONCE_BYTES).toString('base64');

/** Returns the origin of an absolute URL, or `undefined` when unset or invalid. */
export const originOf = (url: string | undefined): string | undefined => {
  if (!url) return undefined;
  try {
    return new URL(url).origin;
  } catch {
    return undefined;
  }
};

const present = (values: readonly (string | undefined | false)[]): string[] => [
  ...new Set(values.filter((v): v is string => Boolean(v))),
];

const directives = (o: CspOptions): [string, string[]][] => [
  ['default-src', [K.self]],
  [
    'script-src',
    present([
      K.self,
      `'nonce-${o.nonce}'`,
      K.strictDynamic,
      THEME_SCRIPT_HASH,
      o.development && K.unsafeEval,
    ]),
  ],
  ['script-src-attr', [K.none]],
  // React renders `style` attributes on the server; inline <style> elements are not allowed.
  ['style-src', [K.self, `'nonce-${o.nonce}'`]],
  ['style-src-attr', [K.unsafeInline]],
  ['img-src', [K.self, K.data, K.blob]],
  ['font-src', [K.self]],
  [
    'connect-src',
    present([
      K.self,
      o.apiOrigin,
      o.issuerOrigin,
      o.development && K.ws,
      o.development && K.wss,
    ]),
  ],
  ['worker-src', [K.self]],
  ['manifest-src', [K.self]],
  ['media-src', [K.self]],
  ['frame-src', [K.none]],
  ['object-src', [K.none]],
  ['base-uri', [K.none]],
  ['form-action', present([K.self, o.issuerOrigin])],
  ['frame-ancestors', [K.none]],
];

/** Builds the page policy. Every directive is explicit so a missing one cannot fall back silently. */
export const buildContentSecurityPolicy = (options: CspOptions): string => {
  const parts = directives(options).map(
    ([name, sources]) => `${name} ${sources.join(' ')}`,
  );
  const secureApi = options.apiOrigin?.startsWith(HTTPS_PROTOCOL) ?? false;
  if (!options.development && secureApi)
    parts.push(CSP_FLAGS.upgradeInsecureRequests);
  return parts.join('; ');
};

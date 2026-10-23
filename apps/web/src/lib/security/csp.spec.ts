// @vitest-environment node
import { createHash } from 'node:crypto';
import { THEME_INIT_SCRIPT } from '@/lib/theme/theme-script';
import {
  buildContentSecurityPolicy,
  createNonce,
  inlineScriptHash,
  originOf,
  THEME_SCRIPT_HASH,
} from './csp';

const parse = (policy: string): Map<string, string[]> =>
  new Map(
    policy.split('; ').map((part) => {
      const [name = '', ...sources] = part.split(' ');
      return [name, sources];
    }),
  );

const base = {
  nonce: 'bm9uY2Utdg==',
  apiOrigin: 'http://localhost:3000',
  development: false,
};

describe('inline script hash', () => {
  it('is the base64 SHA-256 of the exact source', () => {
    const digest = createHash('sha256')
      .update('alert(1)', 'utf8')
      .digest('base64');
    expect(inlineScriptHash('alert(1)')).toBe(`'sha256-${digest}'`);
  });

  it('tracks the theme bootstrap source byte for byte', () => {
    expect(THEME_SCRIPT_HASH).toBe(inlineScriptHash(THEME_INIT_SCRIPT));
    expect(THEME_SCRIPT_HASH).not.toBe(
      inlineScriptHash(`${THEME_INIT_SCRIPT};`),
    );
  });
});

describe('createNonce', () => {
  it('returns 128 random bits, unique per call', () => {
    const nonces = new Set(Array.from({ length: 50 }, createNonce));
    expect(nonces.size).toBe(50);
    for (const n of nonces) expect(Buffer.from(n, 'base64')).toHaveLength(16);
  });
});

describe('originOf', () => {
  it.each([
    ['http://localhost:3000/api/v1', 'http://localhost:3000'],
    ['https://id.example.com/realms/matchiq', 'https://id.example.com'],
    [undefined, undefined],
    ['', undefined],
    ['not a url', undefined],
  ])('%s -> %s', (url, origin) => expect(originOf(url)).toBe(origin));
});

describe('buildContentSecurityPolicy', () => {
  it('locks down the production policy', () => {
    const csp = parse(buildContentSecurityPolicy(base));
    expect(csp.get('default-src')).toEqual(["'self'"]);
    expect(csp.get('script-src')).toEqual([
      "'self'",
      `'nonce-${base.nonce}'`,
      "'strict-dynamic'",
      THEME_SCRIPT_HASH,
    ]);
    expect(csp.get('script-src-attr')).toEqual(["'none'"]);
    expect(csp.get('object-src')).toEqual(["'none'"]);
    expect(csp.get('base-uri')).toEqual(["'none'"]);
    expect(csp.get('frame-ancestors')).toEqual(["'none'"]);
    expect(csp.get('frame-src')).toEqual(["'none'"]);
    expect(csp.get('form-action')).toEqual(["'self'"]);
    expect(csp.get('connect-src')).toEqual(["'self'", base.apiOrigin]);
    expect(csp.get('worker-src')).toEqual(["'self'"]);
  });

  it('never allows eval, unsafe inline scripts or wildcards in production', () => {
    const policy = buildContentSecurityPolicy(base);
    expect(policy).not.toContain("'unsafe-eval'");
    expect(parse(policy).get('script-src')).not.toContain("'unsafe-inline'");
    expect(policy).not.toMatch(/(^|\s)\*(\s|;|$)/);
    expect(policy).not.toMatch(/(^|\s)(https?|ws|wss):(\s|;|$)/);
  });

  it('allows the OIDC issuer for sign-in redirects and token calls', () => {
    const csp = parse(
      buildContentSecurityPolicy({
        ...base,
        issuerOrigin: 'http://localhost:8180',
      }),
    );
    expect(csp.get('connect-src')).toContain('http://localhost:8180');
    expect(csp.get('form-action')).toEqual(["'self'", 'http://localhost:8180']);
  });

  it('lists an origin shared by the API and issuer once', () => {
    const csp = parse(
      buildContentSecurityPolicy({
        ...base,
        apiOrigin: 'https://matchiq.example',
        issuerOrigin: 'https://matchiq.example',
      }),
    );
    expect(csp.get('connect-src')).toEqual([
      "'self'",
      'https://matchiq.example',
    ]);
  });

  it('upgrades insecure requests only for an HTTPS production API', () => {
    const https = { ...base, apiOrigin: 'https://api.example' };
    expect(buildContentSecurityPolicy(https)).toMatch(
      /upgrade-insecure-requests$/,
    );
    expect(buildContentSecurityPolicy(base)).not.toContain('upgrade-insecure');
    expect(
      buildContentSecurityPolicy({ ...https, development: true }),
    ).not.toContain('upgrade-insecure');
  });

  it('keeps production styles and scripts free of unsafe-inline and unsafe-eval', () => {
    const csp = parse(buildContentSecurityPolicy(base));
    for (const directive of ['script-src', 'style-src']) {
      expect(csp.get(directive)).not.toContain("'unsafe-inline'");
      expect(csp.get(directive)).not.toContain("'unsafe-eval'");
    }
    expect(csp.get('style-src')).toEqual(["'self'", `'nonce-${base.nonce}'`]);
  });

  it('lets next dev tooling inject inline styles, without a nonce that would cancel it', () => {
    const dev = parse(
      buildContentSecurityPolicy({ ...base, development: true }),
    );
    expect(dev.get('style-src')).toEqual(["'self'", "'unsafe-inline'"]);
    expect(dev.get('script-src')).not.toContain("'unsafe-inline'");
  });

  it('relaxes only eval, inline styles and the HMR websocket for next dev', () => {
    const dev = parse(
      buildContentSecurityPolicy({ ...base, development: true }),
    );
    expect(dev.get('script-src')).toContain("'unsafe-eval'");
    expect(dev.get('connect-src')).toEqual(
      expect.arrayContaining(['ws:', 'wss:']),
    );
    expect(dev.get('frame-ancestors')).toEqual(["'none'"]);
    expect(dev.get('object-src')).toEqual(["'none'"]);
  });
});

// @vitest-environment node
import { resolveLiveSession } from './live-session';
import {
  createRefreshCoordinator,
  memoryGraceStore,
  type RefreshGrant,
  RefreshRejectedError,
  refreshKey,
} from './refresh-coordinator';
import type { WebSession } from './session';

// The issuer is faked per test; the real OIDC client is never loaded.
vi.mock('./oidc', () => ({ refreshSession: vi.fn() }));

const NOW_S = 1_800_000_000;
const user = { sub: 'u1', name: 'Pat Producer', orgId: 'org', roles: [] };

const session = (refreshToken: string, expiresIn: number): WebSession => ({
  user,
  accessToken: `at-${refreshToken}`,
  accessTokenExpiresAt: NOW_S + expiresIn,
  refreshToken,
});

/** A fake issuer with rotating, single-use refresh tokens. */
const fakeIssuer = () => {
  let live = new Set(['rt-0']);
  let issued = 0;
  const grant = vi.fn<RefreshGrant>(async (s) => {
    await Promise.resolve();
    if (!s.refreshToken || !live.has(s.refreshToken))
      throw new RefreshRejectedError('invalid_grant');
    issued += 1;
    const next = `rt-${issued}`;
    live = new Set([next]);
    return session(next, 300);
  });
  return { grant };
};

describe('refresh coordinator', () => {
  let clock = 0;
  const now = () => clock;
  beforeEach(() => {
    clock = 1_000;
  });

  it('shares one grant between concurrent refreshes of the same token', async () => {
    const issuer = fakeIssuer();
    const coordinator = createRefreshCoordinator({ grant: issuer.grant, now });
    const old = session('rt-0', 10);
    const outcomes = await Promise.all(
      Array.from({ length: 6 }, () => coordinator.refresh(old)),
    );
    expect(issuer.grant).toHaveBeenCalledTimes(1);
    for (const outcome of outcomes) {
      expect(outcome).toEqual({
        kind: 'refreshed',
        session: expect.objectContaining({ refreshToken: 'rt-1' }),
      });
    }
  });

  it('reuses the rotated session for a late request inside the grace window', async () => {
    const issuer = fakeIssuer();
    const coordinator = createRefreshCoordinator({
      grant: issuer.grant,
      now,
      graceMs: 30_000,
    });
    const old = session('rt-0', 10);
    await coordinator.refresh(old);
    clock += 29_000;
    const late = await coordinator.refresh(old);
    expect(late.kind).toBe('refreshed');
    expect(issuer.grant).toHaveBeenCalledTimes(1);
    clock += 2_000;
    expect((await coordinator.refresh(old)).kind).toBe('rejected');
  });

  it('reports a transient issuer failure as unavailable and does not cache it', async () => {
    const grant = vi
      .fn<RefreshGrant>()
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockResolvedValueOnce(session('rt-1', 300));
    const coordinator = createRefreshCoordinator({ grant, now });
    const old = session('rt-0', 10);
    expect((await coordinator.refresh(old)).kind).toBe('unavailable');
    expect((await coordinator.refresh(old)).kind).toBe('refreshed');
  });

  it('rejects a session without a refresh token without calling the issuer', async () => {
    const grant = vi.fn<RefreshGrant>();
    const coordinator = createRefreshCoordinator({ grant, now });
    const { refreshToken: _, ...bare } = session('rt-0', 10);
    expect((await coordinator.refresh(bare)).kind).toBe('rejected');
    expect(grant).not.toHaveBeenCalled();
  });
});

describe('grace store', () => {
  it('is bounded and evicts the oldest and the expired entries', () => {
    const store = memoryGraceStore(2);
    store.set('a', session('a', 1), 100);
    store.set('b', session('b', 1), 200);
    store.set('c', session('c', 1), 300);
    expect(store.get('a', 0)).toBeUndefined();
    expect(store.get('b', 0)?.refreshToken).toBe('b');
    expect(store.get('b', 200)).toBeUndefined();
    expect(store.get('c', 200)?.refreshToken).toBe('c');
  });

  it('keys by a digest, never the raw token', () => {
    expect(refreshKey('rt-secret')).not.toContain('rt-secret');
    expect(refreshKey('rt-secret')).toBe(refreshKey('rt-secret'));
  });
});

describe('resolveLiveSession', () => {
  const coordinatorWith = (grant: RefreshGrant) =>
    createRefreshCoordinator({ grant, store: memoryGraceStore() });

  it('does not refresh a token far from expiry', async () => {
    const grant = vi.fn<RefreshGrant>();
    const live = await resolveLiveSession(
      session('rt-0', 200),
      coordinatorWith(grant),
      NOW_S,
    );
    expect(live).toMatchObject({ kind: 'active', refreshed: false });
    expect(grant).not.toHaveBeenCalled();
  });

  it('keeps a session with a valid access token when the issuer is unreachable', async () => {
    const grant = vi.fn<RefreshGrant>(async () => {
      throw new TypeError('fetch failed');
    });
    const original = session('rt-0', 20);
    const live = await resolveLiveSession(
      original,
      coordinatorWith(grant),
      NOW_S,
    );
    expect(live).toEqual({
      kind: 'active',
      session: original,
      refreshed: false,
    });
  });

  it('keeps a still-valid session even when the issuer rejects the refresh', async () => {
    const grant = vi.fn<RefreshGrant>(async () => {
      throw new RefreshRejectedError('invalid_grant');
    });
    const live = await resolveLiveSession(
      session('rt-0', 20),
      coordinatorWith(grant),
      NOW_S,
    );
    expect(live.kind).toBe('active');
  });

  it('ends an expired session the issuer definitively rejects', async () => {
    const grant = vi.fn<RefreshGrant>(async () => {
      throw new RefreshRejectedError('invalid_grant');
    });
    const live = await resolveLiveSession(
      session('rt-0', -5),
      coordinatorWith(grant),
      NOW_S,
    );
    expect(live).toEqual({ kind: 'expired' });
  });

  it('keeps the cookie of an expired session while the issuer is unreachable', async () => {
    const grant = vi.fn<RefreshGrant>(async () => {
      throw new TypeError('fetch failed');
    });
    const live = await resolveLiveSession(
      session('rt-0', -5),
      coordinatorWith(grant),
      NOW_S,
    );
    expect(live.kind).toBe('unavailable');
  });

  it('lets parallel requests with the same expiring session all stay signed in', async () => {
    const issuer = fakeIssuer();
    const coordinator = createRefreshCoordinator({ grant: issuer.grant });
    const old = session('rt-0', -1);
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        resolveLiveSession(old, coordinator, NOW_S),
      ),
    );
    expect(issuer.grant).toHaveBeenCalledTimes(1);
    expect(results.every((r) => r.kind === 'active' && r.refreshed)).toBe(true);
  });
});

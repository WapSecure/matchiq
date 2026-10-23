import { PreferenceProfile, ProblemDetails } from '@matchiq/contracts';
import { jsonOf, startTestApp, type TestApp } from '../../test/test-app';

jest.setTimeout(40_000);

const ORG_A = 'org_demo';
const ORG_B = 'org_northbank';
const PATH = '/me/preferences';

const SAVED = {
  persona: 'CASUAL',
  locale: 'fr-FR',
  favouriteTeamId: 'tm_harbour',
  followedPlayerIds: ['pl_harbour_9', 'pl_harbour_4'],
  reducedMotion: true,
} as const;

/** Spec §27, §29, §45 and US-012: one saved viewing profile per user per organisation. */
describe('viewer preferences (integration)', () => {
  let t: TestApp;
  let alice: Record<string, string>;

  const as = (sub: string, orgId: string, roles = ['viewer'] as const) =>
    t.bearer(roles, orgId, { claims: { sub } });

  const get = (headers: Record<string, string>) =>
    fetch(`${t.baseUrl}${PATH}`, { headers });

  const put = (headers: Record<string, string>, body: unknown) =>
    fetch(`${t.baseUrl}${PATH}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });

  beforeAll(async () => {
    t = await startTestApp();
    alice = await as('user-alice', ORG_A);
  });

  afterAll(() => t.close());

  it('returns the defaults before anything is saved', async () => {
    const res = await get(alice);
    expect(res.status).toBe(200);
    expect(PreferenceProfile.parse(await res.json())).toEqual({
      persona: 'BROADCAST',
      locale: 'en-GB',
      favouriteTeamId: null,
      followedPlayerIds: [],
      reducedMotion: false,
      updatedAt: null,
    });
  });

  it('saves the whole profile and reads it back', async () => {
    const res = await put(alice, SAVED);
    expect(res.status).toBe(200);
    const saved = PreferenceProfile.parse(await res.json());
    expect(saved).toMatchObject(SAVED);
    expect(saved.updatedAt).not.toBeNull();
    expect(PreferenceProfile.parse(await (await get(alice)).json())).toEqual(
      saved,
    );
  });

  it('is idempotent: repeating the same PUT changes nothing', async () => {
    const first = PreferenceProfile.parse(
      await (await put(alice, SAVED)).json(),
    );
    const second = PreferenceProfile.parse(
      await (await put(alice, SAVED)).json(),
    );
    expect(second).toEqual(first);
    const { rows } = await t.sql.query<{ n: number }>(
      `select count(*)::int as n from preference_profiles where user_id = 'user-alice'`,
    );
    expect(rows[0]?.n).toBe(1);
  });

  it('rejects invalid bodies with RFC 9457 validation problems', async () => {
    for (const body of [
      { ...SAVED, followedPlayerIds: ['pl_a', 'pl_b', 'pl_c', 'pl_d'] },
      { ...SAVED, persona: 'COACH' },
      { ...SAVED, extra: true },
      { persona: 'CASUAL' },
    ]) {
      const res = await put(alice, body);
      expect(res.status).toBe(422);
      expect(res.headers.get('content-type')).toContain(
        'application/problem+json',
      );
      expect(ProblemDetails.safeParse(await jsonOf(res)).success).toBe(true);
    }
  });

  it('keeps users and organisations apart', async () => {
    const bob = await as('user-bob', ORG_A);
    const aliceElsewhere = await as('user-alice', ORG_B);
    for (const other of [bob, aliceElsewhere]) {
      const profile = PreferenceProfile.parse(await (await get(other)).json());
      expect(profile.updatedAt).toBeNull();
      expect(profile.favouriteTeamId).toBeNull();
    }
    await put(aliceElsewhere, { ...SAVED, locale: 'es-ES' });
    const mine = PreferenceProfile.parse(await (await get(alice)).json());
    expect(mine.locale).toBe('fr-FR');
    const { rows } = await t.sql.query<{ org_id: string; locale: string }>(
      `select org_id, locale from preference_profiles where user_id = 'user-alice' order by org_id`,
    );
    expect(rows).toEqual([
      { org_id: ORG_A, locale: 'fr-FR' },
      { org_id: ORG_B, locale: 'es-ES' },
    ]);
  });

  it('refuses the public demo and roles without preferences:write', async () => {
    expect((await get({})).status).toBe(403);
    expect((await put({}, SAVED)).status).toBe(403);
    const developer = await t.bearer(['developer'], ORG_A);
    expect((await put(developer, SAVED)).status).toBe(403);
  });
});

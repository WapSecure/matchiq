import { DEFAULT_VIEWER_PREFERENCES } from '@matchiq/contracts';
import { act, render, waitFor } from '@testing-library/react';
import {
  PREFERENCES_STORAGE_KEY,
  REDUCED_MOTION_ATTRIBUTE,
} from '@/constants/preferences';
import { STUDIO_UI_DEFAULTS, useStudioUi } from '@/features/studio/store';
import { useSession } from '@/lib/auth/session-store';
import type { SessionView } from '@/lib/auth/session-view';
import { biasesFavourite, favouriteFirst } from './favourite-first';
import { usePreferences } from './preferences-store';
import { PreferencesSync } from './preferences-sync';

const SAVED = {
  persona: 'CASUAL',
  locale: 'fr-FR',
  favouriteTeamId: 'tm_home',
  followedPlayerIds: ['pl_hmu9'],
  reducedMotion: true,
} as const;

const signedIn: SessionView = {
  status: 'authenticated',
  ssoEnabled: true,
  user: { sub: 'u1', name: 'Fay Fan', orgId: 'org_demo', roles: ['viewer'] },
  permissions: ['fixtures:read', 'preferences:write'],
};

const reset = () => {
  useStudioUi.setState(STUDIO_UI_DEFAULTS);
  usePreferences.setState({
    favouriteTeamId: null,
    followedPlayerIds: [],
    reducedMotion: false,
    hydrated: false,
    home: 'device',
    saveState: 'idle',
  });
  useSession.setState({ view: null });
  window.localStorage.clear();
  document.documentElement.removeAttribute(REDUCED_MOTION_ATTRIBUTE);
};

const stored = () =>
  JSON.parse(window.localStorage.getItem(PREFERENCES_STORAGE_KEY) ?? 'null');

/** A `fetch` for BFF calls: GET answers `profile`, PUT echoes the body back. */
const stubAccount = (profile: object) => {
  const mock = vi.fn(async (_input: string | URL, init?: RequestInit) => {
    const body =
      init?.method === 'PUT'
        ? {
            ...JSON.parse(String(init.body)),
            updatedAt: '2026-10-23T10:00:00.000Z',
          }
        : profile;
    return new Response(JSON.stringify(body), { status: 200 });
  });
  vi.stubGlobal('fetch', mock);
  return mock;
};

const puts = (mock: ReturnType<typeof stubAccount>) =>
  mock.mock.calls.filter(([, init]) => init?.method === 'PUT');

describe('viewing preferences', () => {
  beforeEach(reset);
  afterEach(() => vi.unstubAllGlobals());

  it('restores device choices before paint and survives a reload', () => {
    window.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(SAVED));
    render(<PreferencesSync />);
    expect(useStudioUi.getState()).toMatchObject({
      persona: 'CASUAL',
      locale: 'fr-FR',
    });
    expect(usePreferences.getState()).toMatchObject({
      favouriteTeamId: 'tm_home',
      hydrated: true,
    });
    expect(
      document.documentElement.hasAttribute(REDUCED_MOTION_ATTRIBUTE),
    ).toBe(true);
  });

  it('saves a change on this device for anonymous viewers', () => {
    render(<PreferencesSync />);
    act(() => useStudioUi.getState().setLocale('es-ES'));
    act(() => usePreferences.getState().followPlayer('pl_awc4'));
    expect(stored()).toMatchObject({
      locale: 'es-ES',
      followedPlayerIds: ['pl_awc4'],
    });
  });

  it('keeps working when browser storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    render(<PreferencesSync />);
    act(() => useStudioUi.getState().setPersona('ANALYST'));
    expect(usePreferences.getState().hydrated).toBe(true);
    expect(useStudioUi.getState().persona).toBe('ANALYST');
    vi.restoreAllMocks();
  });

  it('applies the account profile for signed-in users without saving it back', async () => {
    const fetch = stubAccount({
      ...SAVED,
      updatedAt: '2026-10-22T09:00:00.000Z',
    });
    useSession.setState({ view: signedIn });
    render(<PreferencesSync />);
    await waitFor(() => expect(usePreferences.getState().home).toBe('account'));
    expect(useStudioUi.getState().locale).toBe('fr-FR');
    expect(String(fetch.mock.calls[0]?.[0])).toBe('/bff/me/preferences');
    expect(puts(fetch)).toHaveLength(0);
    act(() => useStudioUi.getState().setLocale('pcm-NG'));
    await waitFor(() => expect(puts(fetch)).toHaveLength(1));
    expect(JSON.parse(String(puts(fetch)[0]?.[1]?.body))).toMatchObject({
      locale: 'pcm-NG',
    });
    await waitFor(() =>
      expect(usePreferences.getState().saveState).toBe('saved'),
    );
  });

  it('adopts device choices into an account that has never saved', async () => {
    window.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(SAVED));
    const fetch = stubAccount({
      ...DEFAULT_VIEWER_PREFERENCES,
      updatedAt: null,
    });
    useSession.setState({ view: signedIn });
    render(<PreferencesSync />);
    await waitFor(() => expect(puts(fetch)).toHaveLength(1));
    expect(JSON.parse(String(puts(fetch)[0]?.[1]?.body))).toEqual(SAVED);
  });
});

describe('favourite team bias', () => {
  const items = [
    { id: 'a', teamId: 'tm_away' },
    { id: 'b', teamId: 'tm_home' },
    { id: 'c' },
    { id: 'd', teamId: 'tm_home' },
  ];

  it('puts the favourite team first and keeps every moment in order', () => {
    expect(favouriteFirst(items, 'tm_home').map((i) => i.id)).toEqual([
      'b',
      'd',
      'a',
      'c',
    ]);
  });

  it('only applies to the fan view', () => {
    expect(biasesFavourite('CASUAL', 'tm_home')).toBe(true);
    expect(biasesFavourite('ANALYST', 'tm_home')).toBe(false);
    expect(biasesFavourite('CASUAL', null)).toBe(false);
  });
});

import {
  DEFAULT_VIEWER_PREFERENCES,
  PreferenceProfile,
  ViewerPreferences,
} from '../src/index.js';

const valid = {
  persona: 'CASUAL',
  locale: 'fr-FR',
  favouriteTeamId: 'tm_harbour',
  followedPlayerIds: ['pl_harbour_9', 'pl_harbour_4'],
  reducedMotion: true,
} as const;

describe('ViewerPreferences', () => {
  it('accepts a full profile and the defaults', () => {
    expect(ViewerPreferences.parse(valid)).toEqual(valid);
    expect(ViewerPreferences.parse(DEFAULT_VIEWER_PREFERENCES)).toEqual(
      DEFAULT_VIEWER_PREFERENCES,
    );
  });

  it('allows at most three distinct followed players', () => {
    const four = ['pl_a', 'pl_b', 'pl_c', 'pl_d'];
    expect(
      ViewerPreferences.safeParse({ ...valid, followedPlayerIds: four })
        .success,
    ).toBe(false);
    expect(
      ViewerPreferences.safeParse({
        ...valid,
        followedPlayerIds: ['pl_a', 'pl_a'],
      }).success,
    ).toBe(false);
  });

  it('rejects unknown fields, personas and malformed ids', () => {
    for (const body of [
      { ...valid, theme: 'dark' },
      { ...valid, persona: 'COACH' },
      { ...valid, favouriteTeamId: 'harbour' },
      { ...valid, followedPlayerIds: ['tm_harbour'] },
    ]) {
      expect(ViewerPreferences.safeParse(body).success).toBe(false);
    }
  });

  it('marks a never-saved profile with a null updatedAt', () => {
    expect(
      PreferenceProfile.parse({
        ...DEFAULT_VIEWER_PREFERENCES,
        updatedAt: null,
      }).updatedAt,
    ).toBeNull();
  });
});

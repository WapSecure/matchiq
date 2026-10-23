import { Inject, Injectable } from '@nestjs/common';
import {
  DEFAULT_VIEWER_PREFERENCES,
  type PreferenceProfile,
  type ViewerPreferences,
} from '@matchiq/contracts';
import type { PreferenceOwner, PreferenceStore } from '@matchiq/db';
import { PREFERENCE_STORE } from '../infrastructure/tokens';

const DEFAULT_PROFILE: PreferenceProfile = {
  ...DEFAULT_VIEWER_PREFERENCES,
  followedPlayerIds: [],
  updatedAt: null,
};

/** The caller's own viewing profile (spec §27, §45). Never another user's. */
@Injectable()
export class PreferencesService {
  constructor(
    @Inject(PREFERENCE_STORE) private readonly store: PreferenceStore,
  ) {}

  async get(owner: PreferenceOwner): Promise<PreferenceProfile> {
    return (await this.store.get(owner)) ?? DEFAULT_PROFILE;
  }

  put(
    owner: PreferenceOwner,
    preferences: ViewerPreferences,
  ): Promise<PreferenceProfile> {
    return this.store.put(owner, preferences);
  }
}

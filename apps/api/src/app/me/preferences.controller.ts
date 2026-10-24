import { Body, Controller, Get, Put } from '@nestjs/common';
import { type PreferenceProfile, ViewerPreferences } from '@matchiq/contracts';
import type { PreferenceOwner } from '@matchiq/db';
import { ZodValidationPipe } from '@matchiq/server-kit';
import type { Actor } from '../auth/actor';
import { CurrentActor, RequirePermission } from '../auth/permissions.guard';
import { ROUTES } from '../constants';
import { PreferencesService } from './preferences.service';

const ownerOf = (actor: Actor): PreferenceOwner => ({
  orgId: actor.orgId,
  userId: actor.id,
});

/**
 * Signed-in viewers only: the public demo has no `preferences:write`, so
 * anonymous viewers keep their choices in the browser instead.
 */
@Controller(`${ROUTES.me}/${ROUTES.mePreferences}`)
export class PreferencesController {
  constructor(private readonly preferences: PreferencesService) {}

  @Get()
  @RequirePermission('preferences:write')
  get(@CurrentActor() actor: Actor): Promise<PreferenceProfile> {
    return this.preferences.get(ownerOf(actor));
  }

  @Put()
  @RequirePermission('preferences:write')
  put(
    @Body(new ZodValidationPipe(ViewerPreferences)) body: ViewerPreferences,
    @CurrentActor() actor: Actor,
  ): Promise<PreferenceProfile> {
    return this.preferences.put(ownerOf(actor), body);
  }
}

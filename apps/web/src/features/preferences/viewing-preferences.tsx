'use client';

import type { Fixture } from '@matchiq/contracts';
import { useMemo } from 'react';
import { TeamSwatch } from '@/components/match/team-swatch';
import { Select, Switch } from '@/components/ui';
import { PREFERENCES_COPY as C } from '@/constants/preferences';
import { cn } from '@/lib/cn';
import { usePreferences } from './preferences-store';

const NONE = 'none';

function SaveNote() {
  const home = usePreferences((s) => s.home);
  const saveState = usePreferences((s) => s.saveState);
  const text =
    saveState === 'failed'
      ? C.saved.failed
      : saveState === 'saving'
        ? C.saved.saving
        : home === 'account'
          ? C.saved.account
          : C.saved.device;
  return (
    <p
      role="status"
      className={cn(
        'w-full text-micro',
        saveState === 'failed' ? 'text-warning' : 'text-ink-subtle',
      )}
    >
      {text}
    </p>
  );
}

/** Favourite team and reduced motion; saved like persona and commentary language. */
export function ViewingPreferences({
  fixture,
  className,
}: {
  fixture: Fixture;
  className?: string;
}) {
  const favourite = usePreferences((s) => s.favouriteTeamId);
  const setFavourite = usePreferences((s) => s.setFavouriteTeam);
  const reducedMotion = usePreferences((s) => s.reducedMotion);
  const setReducedMotion = usePreferences((s) => s.setReducedMotion);
  const options = useMemo(
    () => [
      { id: NONE, label: C.noFavourite },
      ...(['home', 'away'] as const).map((side) => ({
        id: fixture[side].teamId,
        label: fixture[side].name,
        icon: <TeamSwatch side={side} className="size-2.5" />,
      })),
    ],
    [fixture],
  );
  const inFixture = options.some((o) => o.id === favourite);
  return (
    <div className={cn('flex flex-wrap items-end gap-x-4 gap-y-2', className)}>
      <Select
        label={C.favouriteTeam}
        description={C.favouriteTeamHint}
        options={options}
        value={favourite !== null && inFixture ? favourite : NONE}
        onChange={(id) => setFavourite(id === NONE ? null : id)}
        className="min-w-0 flex-1 basis-56"
      />
      <Switch
        isSelected={reducedMotion}
        onChange={setReducedMotion}
        className="pb-1"
      >
        <span className="text-xs">{C.reducedMotion}</span>
      </Switch>
      <SaveNote />
    </div>
  );
}

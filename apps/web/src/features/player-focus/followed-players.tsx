'use client';

import type { Player } from '@matchiq/contracts';
import { CloseIcon } from '@/components/icons';
import { Button } from '@/components/ui';
import { PLAYER_FOCUS_COPY as C } from '@/constants/player-focus';
import { usePreferences } from '@/features/preferences/preferences-store';

/** Up to three followed players: switch focus with one press, or stop following. */
export function FollowedPlayers({
  squad,
  followed,
  current,
}: {
  squad: ReadonlyMap<string, Player>;
  followed: readonly string[];
  current: string | null;
}) {
  const follow = usePreferences((s) => s.followPlayer);
  const unfollow = usePreferences((s) => s.unfollowPlayer);
  if (followed.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      <p className="eyebrow text-ink-subtle">{C.recent}</p>
      <ul className="flex flex-wrap gap-1.5">
        {followed.map((id) => {
          const name = squad.get(id)?.displayName ?? id;
          return (
            <li key={id} className="inline-flex items-center gap-0.5">
              <Button
                size="xs"
                variant={id === current ? 'primary' : 'secondary'}
                aria-pressed={id === current}
                aria-label={id === current ? name : C.switchTo(name)}
                onClick={() => follow(id)}
              >
                {name}
              </Button>
              <Button
                size="xs"
                variant="ghost"
                iconOnly
                aria-label={C.stopFollowing(name)}
                onClick={() => unfollow(id)}
              >
                <CloseIcon size={12} />
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

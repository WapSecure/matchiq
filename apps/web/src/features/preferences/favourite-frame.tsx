import type { ReactNode } from 'react';
import { TrophyIcon } from '@/components/icons';
import { PREFERENCES_COPY as C } from '@/constants/preferences';

/** Highlights a key moment for the viewer's favourite team; the card itself is unchanged. */
export function FavouriteFrame({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
  if (!active) return children;
  return (
    <div data-favourite className="bg-accent-soft/40">
      <p className="eyebrow flex items-center gap-1.5 px-4 pt-2.5 text-accent-strong">
        <TrophyIcon size={12} className="shrink-0" />
        {C.yourTeam}
      </p>
      {children}
    </div>
  );
}

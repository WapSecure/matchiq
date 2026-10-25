import { SIDE_BG } from '@/components/match/team-swatch';
import type { RosterTeam } from '@/features/studio/lib/roster';
import { cn } from '@/lib/cn';

export function RecapRail({
  team,
  major,
}: {
  team: RosterTeam | null;
  major: boolean;
}) {
  return (
    <span aria-hidden className="relative flex justify-center">
      <span className="absolute inset-y-0 w-px bg-line group-first/moment:top-4 group-last/moment:bottom-[calc(100%-1rem)]" />
      <span
        className={cn(
          'relative mt-1.5 rounded-full ring-4 ring-surface',
          major ? 'size-3' : 'size-2.5',
          team ? SIDE_BG[team.side] : 'bg-ink-subtle',
        )}
      />
    </span>
  );
}

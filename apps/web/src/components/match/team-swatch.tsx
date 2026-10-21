import { cn } from '@/lib/cn';

export type Side = 'home' | 'away';

export const SIDE_BG: Record<Side, string> = {
  home: 'bg-home',
  away: 'bg-away',
};

/** Shape differs by side (square vs circle) so identity is not colour-only. */
export function TeamSwatch({
  side,
  className,
}: {
  side: Side;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-block size-2.5 shrink-0',
        SIDE_BG[side],
        side === 'home' ? 'rounded-[2px]' : 'rounded-full',
        className,
      )}
    />
  );
}

import { cn } from '@/lib/cn';
import { SIDE_BG, type Side } from './team-swatch';

const SIZES = {
  sm: 'h-6 min-w-9 px-1 text-[10px]',
  md: 'h-9 min-w-12 px-1.5 text-xs',
  lg: 'h-12 min-w-14 px-2 text-sm',
} as const;

type TeamMonogramProps = {
  shortName: string;
  side: Side;
  size?: keyof typeof SIZES;
  className?: string;
};

/**
 * Crest-free badge built from the team's short name; no club marks are used.
 * Home is square-cornered and away is pill-shaped, so identity never rests on
 * the colour bar alone.
 */
export function TeamMonogram({
  shortName,
  side,
  size = 'md',
  className,
}: TeamMonogramProps) {
  return (
    <span
      aria-hidden
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden border border-line-strong bg-surface-raised font-mono font-semibold tracking-[0.06em] text-ink',
        side === 'home' ? 'rounded-md' : 'rounded-full',
        SIZES[size],
        className,
      )}
    >
      {shortName}
      <span
        className={cn('absolute inset-x-0 bottom-0 h-[3px]', SIDE_BG[side])}
      />
    </span>
  );
}

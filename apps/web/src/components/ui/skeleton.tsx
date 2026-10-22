import { cn } from '@/lib/cn';

/** Placeholder block; a slow sweep reads as loading, not as an empty value. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        'relative overflow-hidden rounded-md bg-surface-raised',
        'motion-safe:after:absolute motion-safe:after:inset-0 motion-safe:after:-translate-x-full motion-safe:after:animate-[shimmer_1.6s_ease-in-out_infinite]',
        'after:bg-linear-to-r after:from-transparent after:via-line/70 after:to-transparent',
        className,
      )}
    />
  );
}

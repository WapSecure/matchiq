import { cn } from '@/lib/cn';

/** Caret for popovers and tooltips; filled with the overlay surface. */
export function OverlayArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      width={12}
      height={6}
      viewBox="0 0 12 6"
      aria-hidden
      focusable="false"
      className={cn('block', className)}
    >
      <path d="M0 0 L6 6 L12 0" />
    </svg>
  );
}

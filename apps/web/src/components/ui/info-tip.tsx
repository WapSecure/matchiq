'use client';

import { InfoIcon } from '@/components/icons';
import { UI_COPY } from '@/constants/ui';
import { cn } from '@/lib/cn';
import { Tooltip } from './tooltip';

/**
 * Small "i" for supplementary context beside a label. Give the same text to
 * assistive tech in the surrounding copy; the tooltip is for sighted users.
 */
export function InfoTip({
  content,
  label = UI_COPY.moreInfo,
  className,
}: {
  content: string;
  label?: string;
  className?: string;
}) {
  return (
    <Tooltip content={content}>
      <button
        type="button"
        aria-label={label}
        className={cn(
          'inline-flex size-6 shrink-0 cursor-help items-center justify-center rounded-full text-ink-subtle outline-none hover:bg-surface-raised hover:text-ink focus-visible:outline-2 focus-visible:outline-accent pointer-coarse:size-11',
          className,
        )}
      >
        <InfoIcon size={14} />
      </button>
    </Tooltip>
  );
}

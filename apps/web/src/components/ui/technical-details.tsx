import type { ReactNode } from 'react';
import { ChevronLeftIcon } from '@/components/icons';
import { TECHNICAL_COPY } from '@/constants/technical';
import { cn } from '@/lib/cn';

type TechnicalDetailsProps = {
  children: ReactNode;
  /** Overrides the default "Technical details" summary. */
  summary?: string;
  className?: string;
};

/**
 * Opt-in depth for engineers and judges: ids, versions, models and timings
 * stay collapsed so the default view reads in plain language.
 */
export function TechnicalDetails({
  children,
  summary = TECHNICAL_COPY.summary,
  className,
}: TechnicalDetailsProps) {
  return (
    <details
      data-testid="technical-details"
      className={cn(
        'group rounded-md border border-line bg-surface-sunken/60 text-xs',
        className,
      )}
    >
      <summary className="flex cursor-pointer select-none items-center gap-1.5 px-3 py-2 text-ink-muted hover:text-ink">
        <ChevronLeftIcon
          size={12}
          className="rotate-180 transition-transform group-open:-rotate-90"
        />
        {summary}
        <span className="text-ink-subtle">· {TECHNICAL_COPY.audience}</span>
      </summary>
      <div className="flex flex-col gap-3 border-t border-line px-3 py-3">
        {children}
      </div>
    </details>
  );
}

import type { ReactNode } from 'react';
import { TECHNICAL_COPY } from '@/constants/technical';
import { cn } from '@/lib/cn';
import { Disclosure } from './disclosure';

type TechnicalDetailsProps = {
  children: ReactNode;
  /** Overrides the default "Technical details" title. */
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
    <div data-testid="technical-details" className={cn('text-xs', className)}>
      <Disclosure
        title={summary}
        meta={TECHNICAL_COPY.audience}
        panelClassName="flex flex-col gap-3 text-xs"
      >
        {children}
      </Disclosure>
    </div>
  );
}

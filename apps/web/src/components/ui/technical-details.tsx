'use client';

import type { ReactNode } from 'react';
import { useInterfaceMessages } from '@/features/interface-language/interface-language-store';
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
  summary,
  className,
}: TechnicalDetailsProps) {
  const copy = useInterfaceMessages().technical;
  return (
    <div data-testid="technical-details" className={cn('text-xs', className)}>
      <Disclosure
        title={summary ?? copy.summary}
        meta={copy.audience}
        panelClassName="flex flex-col gap-3 text-xs"
      >
        {children}
      </Disclosure>
    </div>
  );
}

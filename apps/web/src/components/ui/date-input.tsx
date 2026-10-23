'use client';

import {
  DateInput as AriaDateInput,
  type DateInputProps,
  DateSegment,
} from 'react-aria-components';
import { cn } from '@/lib/cn';

/** Locale-ordered editable segments (day, month, year, hour…); typing and arrows edit each. */
export function DateInput({
  className,
  ...props
}: Omit<DateInputProps, 'children' | 'className'> & { className?: string }) {
  return (
    <AriaDateInput
      {...props}
      className={cn('flex items-center tabular', className)}
    >
      {(segment) => (
        <DateSegment
          segment={segment}
          className={cn(
            // 24px minimum per segment so packed segments meet WCAG 2.5.8.
            'inline-flex min-h-6 min-w-6 items-center justify-center rounded-[3px] px-1 text-ink caret-transparent outline-none',
            'data-placeholder:text-ink-subtle data-[type=literal]:min-w-0 data-[type=literal]:px-0 data-[type=literal]:text-ink-subtle',
            'data-focused:bg-accent data-focused:text-accent-ink',
            'data-invalid:text-critical data-disabled:text-ink-subtle',
          )}
        />
      )}
    </AriaDateInput>
  );
}

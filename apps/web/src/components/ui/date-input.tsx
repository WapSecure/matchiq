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
      className={cn('flex min-w-0 items-center tabular', className)}
    >
      {(segment) => (
        <DateSegment
          segment={segment}
          className={cn(
            'rounded-[3px] px-px text-ink caret-transparent outline-none',
            'data-placeholder:text-ink-subtle data-[type=literal]:px-0 data-[type=literal]:text-ink-subtle',
            'data-focused:bg-accent data-focused:text-accent-ink',
            'data-invalid:text-critical data-disabled:text-ink-subtle',
          )}
        />
      )}
    </AriaDateInput>
  );
}

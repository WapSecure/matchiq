'use client';

import type { ZonedDateTime } from '@internationalized/date';
import type { Locale } from '@matchiq/contracts';
import { useState } from 'react';
import {
  DateRangePicker as AriaDateRangePicker,
  Dialog,
  I18nProvider,
} from 'react-aria-components';
import type { DatePresetId } from '@/constants/ui';
import { cn } from '@/lib/cn';
import {
  dateLocaleFor,
  type InstantRange,
  rangeToZoned,
  zonedToRange,
} from '@/lib/date-time';
import { useTimeZone } from '@/lib/use-time-zone';
import { RangeCalendar } from './calendar';
import { DatePresets } from './date-presets';
import { midnight, RangeFieldGroup, UtcEcho } from './date-range-parts';
import { FIELD_ROOT, FieldFrame, type FieldProps } from './field';
import { Popover } from './popover';

export type DateRangePickerProps = FieldProps & {
  /** UTC instants (ISO 8601); edited in the viewer's time zone. */
  value: InstantRange | null;
  onChange: (value: InstantRange | null) => void;
  presets?: readonly DatePresetId[];
  matchWindow?: InstantRange | null;
  granularity?: 'minute' | 'second';
  locale?: Locale;
};

/** A local-time window with quick presets; the parent only sees UTC instants. */
export function DateRangePicker({
  label,
  hideLabel,
  description,
  errorMessage,
  isDisabled,
  size = 'sm',
  className,
  value,
  onChange,
  presets = [],
  matchWindow,
  granularity = 'minute',
  locale,
}: DateRangePickerProps) {
  const timeZone = useTimeZone();
  const [open, setOpen] = useState(false);
  const zoned = rangeToZoned(value, timeZone);
  return (
    <I18nProvider locale={dateLocaleFor(locale)}>
      <AriaDateRangePicker<ZonedDateTime>
        value={zoned}
        onChange={(r) => onChange(r ? zonedToRange(r) : null)}
        placeholderValue={midnight(timeZone)}
        granularity={granularity}
        // The zone is stated in the help text, which keeps the field narrow on phones.
        hideTimeZone
        isOpen={open}
        onOpenChange={setOpen}
        isDisabled={isDisabled}
        isInvalid={Boolean(errorMessage)}
        aria-label={hideLabel ? label : undefined}
        className={cn(FIELD_ROOT, className)}
      >
        <FieldFrame
          label={label}
          hideLabel={hideLabel}
          description={
            description ?? <UtcEcho value={value} timeZone={timeZone} />
          }
          errorMessage={errorMessage}
        >
          <RangeFieldGroup
            size={size}
            onClear={value ? () => onChange(null) : undefined}
          />
        </FieldFrame>
        <Popover
          placement="bottom end"
          className="max-w-[calc(100vw-1rem)] p-3"
        >
          <Dialog className="flex flex-col gap-3 outline-none sm:flex-row">
            {presets.length > 0 ? (
              <DatePresets
                presets={presets}
                timeZone={timeZone}
                matchWindow={matchWindow}
                onPick={(range) => {
                  onChange(zonedToRange(range));
                  setOpen(false);
                }}
              />
            ) : null}
            <RangeCalendar />
          </Dialog>
        </Popover>
      </AriaDateRangePicker>
    </I18nProvider>
  );
}

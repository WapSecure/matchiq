'use client';

import type { DateValue } from '@internationalized/date';
import type { Locale } from '@matchiq/contracts';
import { useRef, useState } from 'react';
import { Dialog, I18nProvider } from 'react-aria-components';
import { DATE_COPY } from '@/constants/ui';
import { summarizeDate } from '@/lib/date-summary';
import { dateLocaleFor } from '@/lib/date-time';
import { useTimeZone } from '@/lib/use-time-zone';
import type { CalendarExtraProps } from './calendar';
import { DatePanel } from './date-panel';
import { PickerField } from './date-trigger';
import type { FieldProps } from './field';
import { Popover } from './popover';

export type DatePickerProps = FieldProps &
  CalendarExtraProps & {
    value: DateValue | null;
    onChange: (value: DateValue | null) => void;
    /** `hour` and `second` read as `minute`: times are picked to the minute. */
    granularity?: 'day' | 'hour' | 'minute' | 'second';
    minValue?: DateValue;
    maxValue?: DateValue;
    /** App locale; Pidgin falls back to British English date formats. */
    locale?: Locale;
  };

/** A date, or a date and time with `granularity`; typed entry lives inside the popover. */
export function DatePicker({
  value,
  onChange,
  granularity = 'day',
  minValue,
  maxValue,
  locale,
  markedDates,
  markLabel,
  unavailableReason,
  ...field
}: DatePickerProps) {
  const timeZone = useTimeZone();
  const dateLocale = dateLocaleFor(locale);
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLDivElement>(null);
  const withTime = granularity !== 'day';
  return (
    <I18nProvider locale={dateLocale}>
      <PickerField
        {...field}
        summary={
          value ? summarizeDate(value, { locale: dateLocale, timeZone }) : null
        }
        placeholder={withTime ? DATE_COPY.pickDateTime : DATE_COPY.pickDate}
        isOpen={open}
        onOpenChange={setOpen}
        onClear={() => onChange(null)}
        clearLabel={DATE_COPY.clear}
        anchorRef={anchor}
      >
        <Popover triggerRef={anchor} placement="bottom start" fit="panel">
          <Dialog aria-label={field.label} className="outline-none">
            <DatePanel
              value={value}
              onChange={onChange}
              withTime={withTime}
              timeZone={timeZone}
              minValue={minValue}
              maxValue={maxValue}
              markedDates={markedDates}
              markLabel={markLabel}
              unavailableReason={unavailableReason}
              onDone={() => setOpen(false)}
            />
          </Dialog>
        </Popover>
      </PickerField>
    </I18nProvider>
  );
}

/** Date and time to the minute. */
export function DateTimePicker(
  props: Omit<DatePickerProps, 'granularity'> & {
    granularity?: 'minute' | 'second';
  },
) {
  return <DatePicker {...props} granularity={props.granularity ?? 'minute'} />;
}

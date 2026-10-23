'use client';

import type { DateValue } from '@internationalized/date';
import type { Locale } from '@matchiq/contracts';
import {
  DatePicker as AriaDatePicker,
  Button,
  Dialog,
  Group,
  I18nProvider,
} from 'react-aria-components';
import { CalendarIcon } from '@/components/icons';
import { DATE_COPY } from '@/constants/ui';
import { cn } from '@/lib/cn';
import { dateLocaleFor } from '@/lib/date-time';
import { Calendar } from './calendar';
import {
  CONTROL_HEIGHT,
  CONTROL_INVALID,
  CONTROL_SURFACE,
} from './control-styles';
import { DateInput } from './date-input';
import { FIELD_ROOT, FieldFrame, type FieldProps } from './field';
import { Popover } from './popover';

export type DatePickerProps = FieldProps & {
  value: DateValue | null;
  onChange: (value: DateValue | null) => void;
  granularity?: 'day' | 'hour' | 'minute' | 'second';
  minValue?: DateValue;
  maxValue?: DateValue;
  /** App locale; Pidgin falls back to British English date formats. */
  locale?: Locale;
};

export const PICKER_GROUP = cn(
  'flex w-full items-center gap-2 bg-surface-sunken pl-2.5 pr-0.5',
  CONTROL_SURFACE,
  'data-hovered:border-control data-focus-within:border-accent data-disabled:cursor-not-allowed data-disabled:border-line data-disabled:bg-surface-raised',
  CONTROL_INVALID,
);

export const PICKER_BUTTON =
  'flex size-7 shrink-0 items-center justify-center rounded-sm text-ink-subtle outline-none pointer-coarse:size-10 data-hovered:bg-surface-raised data-hovered:text-ink data-pressed:bg-surface-sunken data-focus-visible:outline-2 data-focus-visible:outline-accent';

/** Date, or date and time with `granularity`; the field is typeable and the calendar optional. */
export function DatePicker({
  label,
  hideLabel,
  description,
  errorMessage,
  isDisabled,
  size = 'sm',
  className,
  value,
  onChange,
  granularity = 'day',
  minValue,
  maxValue,
  locale,
}: DatePickerProps) {
  return (
    <I18nProvider locale={dateLocaleFor(locale)}>
      <AriaDatePicker<DateValue>
        value={value}
        onChange={onChange}
        granularity={granularity}
        minValue={minValue}
        maxValue={maxValue}
        isDisabled={isDisabled}
        isInvalid={Boolean(errorMessage)}
        aria-label={hideLabel ? label : undefined}
        className={cn(FIELD_ROOT, className)}
      >
        <FieldFrame
          label={label}
          hideLabel={hideLabel}
          description={description}
          errorMessage={errorMessage}
        >
          <Group className={cn(PICKER_GROUP, CONTROL_HEIGHT[size])}>
            <DateInput className="min-w-0 flex-1" />
            <Button
              aria-label={DATE_COPY.openCalendar}
              className={PICKER_BUTTON}
            >
              <CalendarIcon size={15} />
            </Button>
          </Group>
        </FieldFrame>
        <Popover placement="bottom end" className="p-3">
          <Dialog className="outline-none">
            <Calendar />
          </Dialog>
        </Popover>
      </AriaDatePicker>
    </I18nProvider>
  );
}

/** Date and time to the minute; zoned values also show their time zone. */
export function DateTimePicker(
  props: Omit<DatePickerProps, 'granularity'> & {
    granularity?: 'minute' | 'second';
  },
) {
  return <DatePicker {...props} granularity={props.granularity ?? 'minute'} />;
}

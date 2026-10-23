'use client';

import { type DateValue, today, toCalendarDate } from '@internationalized/date';
import { useState } from 'react';
import { DateField } from 'react-aria-components';
import { DATE_COPY } from '@/constants/ui';
import { cn } from '@/lib/cn';
import { nextQuarterHour, type TimedValue, withDay } from '@/lib/date-edit';
import { Button } from './button';
import { Calendar, type CalendarExtraProps } from './calendar';
import {
  FooterMeta,
  PANE,
  PANE_DIVIDER,
  PickerFooter,
  TextAction,
} from './date-picker-parts';
import { DateInput } from './date-input';
import { TimeStepper } from './time-stepper';

export type DatePanelProps = CalendarExtraProps & {
  value: DateValue | null;
  onChange: (value: DateValue | null) => void;
  withTime: boolean;
  timeZone: string;
  minValue?: DateValue;
  maxValue?: DateValue;
  onDone: () => void;
};

const isTimed = (v: DateValue | null): v is TimedValue =>
  Boolean(v && 'hour' in v);

const entryLabel = (exact: boolean, withTime: boolean): string => {
  if (exact) return DATE_COPY.calendarEntry;
  return withTime ? DATE_COPY.exactEntry : DATE_COPY.typeDate;
};

type ExactFieldProps = Pick<
  DatePanelProps,
  'value' | 'onChange' | 'withTime' | 'minValue' | 'maxValue'
> & { seed: DateValue };

/** Typed entry for power users; seeded so it never opens on an empty mask. */
function ExactField({
  value,
  seed,
  withTime,
  onChange,
  ...bounds
}: ExactFieldProps) {
  return (
    <DateField<DateValue>
      aria-label={withTime ? DATE_COPY.pickDateTime : DATE_COPY.pickDate}
      value={value ?? seed}
      onChange={onChange}
      granularity={withTime ? 'minute' : 'day'}
      minValue={bounds.minValue}
      maxValue={bounds.maxValue}
      hideTimeZone
      shouldForceLeadingZeros
      autoFocus
      className="group/exact w-70 pointer-coarse:w-77"
    >
      <DateInput className="h-10 w-full rounded-md border border-line-strong bg-surface-sunken px-3 text-sm font-medium group-data-focus-within/exact:border-accent" />
    </DateField>
  );
}

/** Calendar, optional time row and footer; picking a day closes a date-only picker. */
export function DatePanel(props: DatePanelProps) {
  const { value, onChange, withTime, timeZone, onDone } = props;
  const [exact, setExact] = useState(false);
  const [pending, setPending] = useState<TimedValue>(() =>
    nextQuarterHour(timeZone),
  );
  const time = isTimed(value) ? value : pending;
  const pickDay = (day: DateValue) => {
    if (!withTime) {
      onChange(day);
      onDone();
      return;
    }
    onChange(withDay(time, day));
  };
  return (
    <>
      <div className={PANE}>
        {exact ? (
          <ExactField
            value={value}
            seed={withTime ? time : today(timeZone)}
            withTime={withTime}
            onChange={onChange}
            minValue={props.minValue}
            maxValue={props.maxValue}
          />
        ) : (
          <Calendar
            autoFocus
            value={value ? toCalendarDate(value) : null}
            onChange={pickDay}
            minValue={props.minValue}
            maxValue={props.maxValue}
            markedDates={props.markedDates}
            markLabel={props.markLabel}
            unavailableReason={props.unavailableReason}
          />
        )}
      </div>
      {withTime && !exact ? (
        <div className={cn(PANE, PANE_DIVIDER, 'py-2.5 sm:py-3')}>
          <TimeStepper
            label={DATE_COPY.time}
            value={time}
            onChange={(t) => (value ? onChange(t) : setPending(t))}
            onNow={onChange}
            timeZone={timeZone}
          />
        </div>
      ) : null}
      <PickerFooter
        start={
          <FooterMeta timeZone={withTime ? timeZone : undefined}>
            <TextAction onPress={() => setExact((e) => !e)}>
              {entryLabel(exact, withTime)}
            </TextAction>
          </FooterMeta>
        }
      >
        {withTime || exact ? (
          <Button variant="primary" onClick={onDone}>
            {DATE_COPY.done}
          </Button>
        ) : (
          <Button
            onClick={() => {
              onChange(today(timeZone));
              onDone();
            }}
          >
            {DATE_COPY.today}
          </Button>
        )}
      </PickerFooter>
    </>
  );
}

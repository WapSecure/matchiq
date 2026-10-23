'use client';

import type { ZonedDateTime } from '@internationalized/date';
import { DateField, Label } from 'react-aria-components';
import { DATE_COPY } from '@/constants/ui';
import { cn } from '@/lib/cn';
import { DateInput } from './date-input';
import { LABEL } from './control-styles';
import { TimeStepper } from './time-stepper';
import type { RangeDraft } from './use-range-draft';

const EDGES = [
  { edge: 'start', label: DATE_COPY.startTime, exact: DATE_COPY.start },
  { edge: 'end', label: DATE_COPY.endTime, exact: DATE_COPY.end },
] as const;

/** Start and end time rows under the calendar. */
export function RangeTimes({
  range,
  timeZone,
}: {
  range: RangeDraft;
  timeZone: string;
}) {
  return (
    <div className="grid gap-2.5 md:grid-cols-2 md:gap-6">
      {EDGES.map(({ edge, label }) => (
        <TimeStepper
          key={edge}
          label={label}
          value={range.times[edge]}
          onChange={(v) => range.setTime(edge, v as ZonedDateTime)}
          onNow={
            edge === 'end'
              ? (v) => range.setTime(edge, v as ZonedDateTime)
              : undefined
          }
          timeZone={timeZone}
        />
      ))}
    </div>
  );
}

/** Typed start and end, to the minute, for people who know the exact window. */
export function RangeExact({ range }: { range: RangeDraft }) {
  return (
    <div className="grid w-full gap-3 sm:w-70 md:w-auto md:min-w-[36rem] md:grid-cols-2">
      {EDGES.map(({ edge, exact }, i) => (
        <DateField<ZonedDateTime>
          key={edge}
          value={range.times[edge]}
          onChange={(v) => range.setExact(edge, v)}
          granularity="minute"
          hideTimeZone
          shouldForceLeadingZeros
          autoFocus={i === 0}
          className="group/exact flex flex-col gap-1.5"
        >
          <Label className={LABEL}>{exact}</Label>
          <DateInput
            className={cn(
              'h-10 rounded-md border border-line-strong bg-surface-sunken px-3 text-sm font-medium pointer-coarse:h-11',
              'group-data-focus-within/exact:border-accent',
            )}
          />
        </DateField>
      ))}
    </div>
  );
}

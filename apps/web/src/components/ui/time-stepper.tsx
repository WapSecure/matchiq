'use client';

import { Button, TimeField } from 'react-aria-components';
import { MinusIcon, PlusIcon } from '@/components/icons';
import { DATE_COPY } from '@/constants/ui';
import { cn } from '@/lib/cn';
import {
  nowLike,
  stepTime,
  TIME_STEP_MINUTES,
  type TimedValue,
} from '@/lib/date-edit';
import { DateInput } from './date-input';

const STEP =
  'flex size-8 shrink-0 items-center justify-center rounded-md text-ink-muted outline-none transition-colors duration-150 pointer-coarse:size-11 data-hovered:bg-surface-raised data-hovered:text-ink data-pressed:bg-surface-sunken data-focus-visible:outline-2 data-focus-visible:outline-offset-1 data-focus-visible:outline-accent data-disabled:opacity-40';

const CHIP =
  'h-8 rounded-md border border-line-strong bg-surface px-2.5 text-[13px] font-medium text-ink-muted outline-none transition-colors duration-150 pointer-coarse:h-11 data-hovered:border-control data-hovered:text-ink data-pressed:bg-surface-sunken data-focus-visible:outline-2 data-focus-visible:outline-offset-1 data-focus-visible:outline-accent data-disabled:opacity-40';

type TimeStepperProps = {
  label: string;
  value: TimedValue;
  onChange: (value: TimedValue) => void;
  timeZone: string;
  isDisabled?: boolean;
  /** Offers a "Now" shortcut, which also moves the day to today. */
  onNow?: (value: TimedValue) => void;
};

/** Hours and minutes: type them, use the arrow keys, or step by a quarter hour. */
export function TimeStepper({
  label,
  value,
  onChange,
  timeZone,
  isDisabled,
  onNow,
}: TimeStepperProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span aria-hidden className="eyebrow">
        {label}
      </span>
      <div className="flex items-center gap-1">
        <Button
          slot={null}
          aria-label={DATE_COPY.earlier(label, TIME_STEP_MINUTES)}
          isDisabled={isDisabled}
          onPress={() => onChange(stepTime(value, -1))}
          className={STEP}
        >
          <MinusIcon size={15} />
        </Button>
        <TimeField<TimedValue>
          aria-label={label}
          value={value}
          onChange={(next) => next && onChange(next as TimedValue)}
          granularity="minute"
          hideTimeZone
          shouldForceLeadingZeros
          isDisabled={isDisabled}
          className="group/time"
        >
          <DateInput
            className={cn(
              'h-8 rounded-md border border-line bg-surface-sunken px-2 text-sm font-semibold pointer-coarse:h-11',
              'group-data-focus-within/time:border-accent',
            )}
          />
        </TimeField>
        <Button
          slot={null}
          aria-label={DATE_COPY.later(label, TIME_STEP_MINUTES)}
          isDisabled={isDisabled}
          onPress={() => onChange(stepTime(value, 1))}
          className={STEP}
        >
          <PlusIcon size={15} />
        </Button>
        {onNow ? (
          <Button
            slot={null}
            isDisabled={isDisabled}
            onPress={() => onNow(nowLike(value, timeZone))}
            className={cn(CHIP, 'ms-1')}
          >
            {DATE_COPY.now}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

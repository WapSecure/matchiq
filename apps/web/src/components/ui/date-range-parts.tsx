'use client';

import { now, type ZonedDateTime } from '@internationalized/date';
import { Button, Group } from 'react-aria-components';
import { CalendarIcon, CloseIcon } from '@/components/icons';
import { DATE_COPY } from '@/constants/ui';
import { cn } from '@/lib/cn';
import { formatUtc, type InstantRange } from '@/lib/date-time';
import type { ControlSize } from './control-styles';
import { DateInput } from './date-input';
import { PICKER_BUTTON, PICKER_GROUP } from './date-picker';

// Typing into an empty field then yields zoned values, not floating ones.
export const midnight = (timeZone: string): ZonedDateTime =>
  now(timeZone).set({ hour: 0, minute: 0, second: 0, millisecond: 0 });

/** States the zone being edited and echoes the chosen window in UTC. */
export function UtcEcho({
  value,
  timeZone,
}: {
  value: InstantRange | null;
  timeZone: string;
}) {
  return (
    <span className="flex flex-col gap-0.5">
      <span>{DATE_COPY.zoneNote(timeZone)}</span>
      {value ? (
        <span className="tabular font-mono text-ink-muted">
          {DATE_COPY.utcEcho(
            `${formatUtc(value.start)} → ${formatUtc(value.end)}`,
          )}
        </span>
      ) : null}
    </span>
  );
}

const MIN_HEIGHT: Record<ControlSize, string> = {
  sm: 'min-h-8 text-[13px] pointer-coarse:min-h-11',
  md: 'min-h-10 text-sm pointer-coarse:min-h-11',
};

/** Start and end segments, then clear and calendar buttons; wraps on narrow screens. */
export function RangeFieldGroup({
  size,
  onClear,
}: {
  size: ControlSize;
  onClear?: () => void;
}) {
  return (
    <Group className={cn(PICKER_GROUP, MIN_HEIGHT[size], 'flex-wrap py-1')}>
      <DateInput slot="start" aria-label={DATE_COPY.start} />
      <span aria-hidden className="px-0.5 text-ink-subtle">
        –
      </span>
      <DateInput slot="end" aria-label={DATE_COPY.end} className="flex-1" />
      {onClear ? (
        <Button
          // Opts out of the picker's button context, which opens the calendar.
          slot={null}
          aria-label={DATE_COPY.clear}
          onPress={onClear}
          className={PICKER_BUTTON}
        >
          <CloseIcon size={14} />
        </Button>
      ) : null}
      <Button aria-label={DATE_COPY.openCalendar} className={PICKER_BUTTON}>
        <CalendarIcon size={15} />
      </Button>
    </Group>
  );
}

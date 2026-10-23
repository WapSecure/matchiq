'use client';

import type { Locale } from '@matchiq/contracts';
import { useRef, useState } from 'react';
import { Dialog, I18nProvider } from 'react-aria-components';
import {
  DATE_COPY,
  DATE_PRESET_LABELS,
  type DatePresetId,
} from '@/constants/ui';
import { summarizeRange } from '@/lib/date-summary';
import {
  dateLocaleFor,
  type InstantRange,
  rangeToZoned,
} from '@/lib/date-time';
import { useTimeZone } from '@/lib/use-time-zone';
import type { CalendarExtraProps } from './calendar';
import { RangePanel } from './date-range-panel';
import { PickerField } from './date-trigger';
import type { FieldProps } from './field';
import { Popover } from './popover';

export type DateRangePickerProps = FieldProps &
  CalendarExtraProps & {
    /** UTC instants (ISO 8601); edited in the viewer's time zone. */
    value: InstantRange | null;
    onChange: (value: InstantRange | null) => void;
    presets?: readonly DatePresetId[];
    matchWindow?: InstantRange | null;
    /** Kept for compatibility; times are always picked to the minute. */
    granularity?: 'minute' | 'second';
    locale?: Locale;
  };

type Picked = { id: DatePresetId; range: InstantRange };

const samePicked = (picked: Picked | null, value: InstantRange | null) =>
  picked &&
  value &&
  picked.range.start === value.start &&
  picked.range.end === value.end
    ? picked.id
    : null;

/** A local-time window with quick presets; the parent only sees UTC instants. */
export function DateRangePicker({
  value,
  onChange,
  presets = [],
  matchWindow,
  locale,
  markedDates,
  markLabel,
  unavailableReason,
  granularity: _granularity,
  ...field
}: DateRangePickerProps) {
  const timeZone = useTimeZone();
  const dateLocale = dateLocaleFor(locale);
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Picked | null>(null);
  const anchor = useRef<HTMLDivElement>(null);
  const activePreset = samePicked(picked, value);
  const zoned = rangeToZoned(value, timeZone);
  const summary = activePreset
    ? DATE_PRESET_LABELS[activePreset]
    : zoned && summarizeRange(zoned, { locale: dateLocale, timeZone });
  return (
    <I18nProvider locale={dateLocale}>
      <PickerField
        {...field}
        summary={summary || null}
        placeholder={DATE_COPY.anyTime}
        isOpen={open}
        onOpenChange={setOpen}
        onClear={() => onChange(null)}
        clearLabel={DATE_COPY.clear}
        anchorRef={anchor}
      >
        <Popover
          triggerRef={anchor}
          placement="bottom start"
          fit="panel"
          className="max-w-[calc(100vw-1rem)]"
        >
          <Dialog aria-label={field.label} className="outline-none">
            <RangePanel
              value={value}
              timeZone={timeZone}
              presets={presets}
              activePreset={activePreset}
              matchWindow={matchWindow}
              markedDates={markedDates}
              markLabel={markLabel}
              unavailableReason={unavailableReason}
              onApply={(range, id) => {
                setPicked(range && id ? { id, range } : null);
                onChange(range);
                setOpen(false);
              }}
              onCancel={() => setOpen(false)}
            />
          </Dialog>
        </Popover>
      </PickerField>
    </I18nProvider>
  );
}

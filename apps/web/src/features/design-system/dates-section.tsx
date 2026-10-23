'use client';

import {
  type DateValue,
  now,
  parseDate,
  parseDateTime,
  toZoned,
} from '@internationalized/date';
import type { Locale } from '@matchiq/contracts';
import { useState } from 'react';
import {
  Calendar,
  DatePicker,
  DateRangePicker,
  DateTimePicker,
  RangeCalendar,
} from '@/components/ui';
import { GALLERY_COPY as C } from '@/constants/design-system';
import type { InstantRange } from '@/lib/date-time';
import { useTimeZone } from '@/lib/use-time-zone';
import { GallerySection, Specimen } from './gallery-section';

const SAMPLE_DATE = '2026-10-24';
const MATCH_DAYS = ['2026-10-17', '2026-10-24', '2026-10-31'].map(parseDate);
const RANGE_START = parseDate('2026-10-12');
const RANGE_END = parseDate('2026-10-21');
/** Sundays are struck in the sample to show the unavailable state. */
const isSunday = (d: DateValue) => d.toDate('UTC').getUTCDay() === 0;
const SAMPLE_KICK_OFF = '2026-10-24T15:00';
const MATCH_MINUTES = 105;
const LOCALES = Object.keys(C.locales) as Locale[];

const SAMPLE_RANGE: InstantRange = {
  start: '2026-10-24T13:00:00.000Z',
  end: '2026-10-24T14:45:00.000Z',
};

const matchWindow = (timeZone: string): InstantRange => {
  const end = now(timeZone);
  return {
    start: end.subtract({ minutes: MATCH_MINUTES }).toDate().toISOString(),
    end: end.toDate().toISOString(),
  };
};

function RangeSpecimens() {
  const timeZone = useTimeZone();
  const [range, setRange] = useState<InstantRange | null>(null);
  return (
    <>
      <Specimen state={`${C.states.empty} · ${C.states.filled}`} wide>
        <DateRangePicker
          label={C.rangeLabel}
          value={range}
          onChange={setRange}
          presets={['last15m', 'lastHour', 'today', 'last7d', 'thisMatch']}
          matchWindow={matchWindow(timeZone)}
          markedDates={MATCH_DAYS}
        />
        <DateRangePicker
          label={C.rangeFilledLabel}
          value={SAMPLE_RANGE}
          onChange={() => undefined}
          presets={['lastHour', 'today']}
        />
      </Specimen>
      <Specimen state={C.states.range}>
        <RangeCalendar
          aria-label={C.rangeLabel}
          defaultValue={{ start: RANGE_START, end: RANGE_END }}
          markedDates={MATCH_DAYS}
        />
      </Specimen>
    </>
  );
}

export function DatesSection() {
  const timeZone = useTimeZone();
  const [date, setDate] = useState<DateValue | null>(parseDate(SAMPLE_DATE));
  const [time, setTime] = useState<DateValue | null>(null);
  const kickOff = time ?? toZoned(parseDateTime(SAMPLE_KICK_OFF), timeZone);
  return (
    <GallerySection title={C.sections.dates}>
      <Specimen
        state={`${C.states.empty} · ${C.states.filled} · ${C.states.invalid}`}
      >
        <DatePicker label={C.dateLabel} value={null} onChange={setDate} />
        <DatePicker label={C.dateLabel} value={date} onChange={setDate} />
        <DatePicker
          label={C.dateLabel}
          value={date}
          onChange={setDate}
          errorMessage={C.dateInvalid}
        />
      </Specimen>
      <Specimen
        state={`${C.states.filled} · ${C.states.medium} · ${C.states.disabled}`}
      >
        <DateTimePicker
          label={C.dateTimeLabel}
          value={kickOff}
          onChange={setTime}
        />
        <DateTimePicker
          label={C.dateTimeLabel}
          value={kickOff}
          onChange={setTime}
          size="md"
          markedDates={MATCH_DAYS}
        />
        <DatePicker
          label={C.dateLabel}
          value={date}
          onChange={setDate}
          isDisabled
        />
      </Specimen>
      <Specimen state={C.states.markers}>
        <Calendar
          aria-label={C.dateLabel}
          defaultValue={parseDate(SAMPLE_DATE)}
          markedDates={MATCH_DAYS}
          isDateUnavailable={isSunday}
          unavailableReason={C.unavailableReason}
        />
      </Specimen>
      <RangeSpecimens />
      <Specimen state={C.states.default}>
        {LOCALES.map((locale) => (
          <DatePicker
            key={locale}
            label={C.locales[locale as keyof typeof C.locales]}
            value={date}
            onChange={setDate}
            locale={locale}
          />
        ))}
      </Specimen>
    </GallerySection>
  );
}

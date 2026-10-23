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
} from '@/components/ui';
import { GALLERY_COPY as C } from '@/constants/design-system';
import type { InstantRange } from '@/lib/date-time';
import { useTimeZone } from '@/lib/use-time-zone';
import { GallerySection, Specimen } from './gallery-section';

const SAMPLE_DATE = '2026-10-24';
const SAMPLE_KICK_OFF = '2026-10-24T15:00';
const MATCH_MINUTES = 105;
const LOCALES = Object.keys(C.locales) as Locale[];

const matchWindow = (timeZone: string): InstantRange => {
  const end = now(timeZone);
  return {
    start: end.subtract({ minutes: MATCH_MINUTES }).toDate().toISOString(),
    end: end.toDate().toISOString(),
  };
};

export function DatesSection() {
  const timeZone = useTimeZone();
  const [date, setDate] = useState<DateValue | null>(parseDate(SAMPLE_DATE));
  const [time, setTime] = useState<DateValue | null>(null);
  const [range, setRange] = useState<InstantRange | null>(null);
  const kickOff = time ?? toZoned(parseDateTime(SAMPLE_KICK_OFF), timeZone);
  return (
    <GallerySection title={C.sections.dates}>
      <Specimen state={`${C.states.default} · ${C.states.invalid}`}>
        <DatePicker label={C.dateLabel} value={date} onChange={setDate} />
        <DatePicker
          label={C.dateLabel}
          value={date}
          onChange={setDate}
          errorMessage={C.dateInvalid}
        />
        <DatePicker
          label={C.dateLabel}
          value={date}
          onChange={setDate}
          isDisabled
        />
      </Specimen>
      <Specimen state={C.states.default}>
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
          granularity="second"
        />
      </Specimen>
      <Specimen state={C.states.default}>
        <Calendar
          aria-label={C.dateLabel}
          defaultValue={parseDate(SAMPLE_DATE)}
        />
      </Specimen>
      <Specimen state={C.states.default} wide>
        <DateRangePicker
          label={C.rangeLabel}
          value={range}
          onChange={setRange}
          presets={['last15m', 'lastHour', 'today', 'thisMatch']}
          matchWindow={matchWindow(timeZone)}
          granularity="second"
        />
      </Specimen>
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

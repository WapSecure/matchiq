'use client';

import { useState } from 'react';
import { useLocale } from 'react-aria-components';
import { DATE_COPY, type DatePresetId } from '@/constants/ui';
import { cn } from '@/lib/cn';
import { summarizeRange } from '@/lib/date-summary';
import {
  type InstantRange,
  type ZonedRange,
  zonedToRange,
} from '@/lib/date-time';
import { useMediaQuery } from '@/lib/use-media-query';
import { Button } from './button';
import { type CalendarExtraProps, RangeCalendar } from './calendar';
import { ERROR_TEXT } from './control-styles';
import {
  FooterMeta,
  PANE,
  PANE_DIVIDER,
  PickerFooter,
  TextAction,
} from './date-picker-parts';
import { DatePresets } from './date-presets';
import { RangeExact, RangeTimes } from './date-range-times';
import { type RangeDraft, useRangeDraft } from './use-range-draft';

const TWO_MONTHS = '(min-width: 56rem)';

export type RangePanelProps = CalendarExtraProps & {
  value: InstantRange | null;
  timeZone: string;
  presets: readonly DatePresetId[];
  activePreset: DatePresetId | null;
  matchWindow?: InstantRange | null;
  onApply: (range: InstantRange | null, preset?: DatePresetId) => void;
  onCancel: () => void;
};

function Summary({ range, timeZone }: { range: RangeDraft; timeZone: string }) {
  const { locale } = useLocale();
  if (range.isReversed)
    return <p className={ERROR_TEXT}>{DATE_COPY.rangeTooLong}</p>;
  return (
    <p
      aria-live="polite"
      className={cn(
        'truncate text-[13px] tabular',
        range.draft ? 'font-semibold text-ink' : 'text-ink-subtle',
      )}
    >
      {range.draft
        ? summarizeRange(range.draft, { locale, timeZone })
        : DATE_COPY.pickRange}
    </p>
  );
}

function Main({
  range,
  timeZone,
  extras,
  exact,
}: {
  range: RangeDraft;
  timeZone: string;
  extras: CalendarExtraProps;
  exact: boolean;
}) {
  const twoMonths = useMediaQuery(TWO_MONTHS);
  return (
    <div className="flex min-w-0 flex-col">
      <div className={cn(PANE, 'flex justify-center')}>
        {exact ? (
          <RangeExact range={range} />
        ) : (
          <RangeCalendar
            autoFocus
            value={range.days}
            onChange={range.pickDays}
            visibleMonths={twoMonths ? 2 : 1}
            {...extras}
          />
        )}
      </div>
      {exact ? null : (
        <div className={cn(PANE, PANE_DIVIDER, 'py-2.5 sm:py-3')}>
          <RangeTimes range={range} timeZone={timeZone} />
        </div>
      )}
    </div>
  );
}

/** Presets on the left, calendar and times on the right, then Clear, Cancel and Apply. */
export function RangePanel(props: RangePanelProps) {
  const { timeZone, onApply } = props;
  const range = useRangeDraft(props.value, timeZone);
  const [exact, setExact] = useState(false);
  const apply = (draft: ZonedRange) => onApply(zonedToRange(draft));
  return (
    <div className="flex flex-col">
      <div className="flex flex-col sm:flex-row">
        {props.presets.length > 0 ? (
          <DatePresets
            presets={props.presets}
            timeZone={timeZone}
            matchWindow={props.matchWindow}
            active={props.activePreset}
            onPick={(r, id) => onApply(zonedToRange(r), id)}
          />
        ) : null}
        <Main
          range={range}
          timeZone={timeZone}
          exact={exact}
          extras={{
            markedDates: props.markedDates,
            markLabel: props.markLabel,
            unavailableReason: props.unavailableReason,
          }}
        />
      </div>
      <PickerFooter
        start={
          <>
            <Summary range={range} timeZone={timeZone} />
            <FooterMeta timeZone={timeZone}>
              <TextAction onPress={() => setExact((e) => !e)}>
                {exact ? DATE_COPY.calendarEntry : DATE_COPY.exactEntry}
              </TextAction>
            </FooterMeta>
          </>
        }
      >
        <Button variant="ghost" onClick={() => onApply(null)}>
          {DATE_COPY.clearShort}
        </Button>
        <Button onClick={props.onCancel}>{DATE_COPY.cancel}</Button>
        <Button
          variant="primary"
          disabled={!range.draft || range.isReversed}
          onClick={() => range.draft && apply(range.draft)}
        >
          {DATE_COPY.apply}
        </Button>
      </PickerFooter>
    </div>
  );
}

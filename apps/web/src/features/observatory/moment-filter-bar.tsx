'use client';

import { SegmentedControl, Select } from '@/components/ui';
import {
  FACT_CHECKS_COPY,
  FILTER_ORDER,
  type MomentFilter,
} from '@/constants/fact-checks';
import { MinuteStrip, type StripMarker } from './minute-strip';

const copy = FACT_CHECKS_COPY.filters;

type MomentFilterBarProps = {
  value: MomentFilter;
  onChange: (value: MomentFilter) => void;
  counts: Record<MomentFilter, number>;
  markers: readonly StripMarker[];
};

/** Filter and minute strip; a Select replaces the segments on narrow screens. */
export function MomentFilterBar({
  value,
  onChange,
  counts,
  markers,
}: MomentFilterBarProps) {
  const options = FILTER_ORDER.map((f) => ({
    value: f,
    id: f,
    label: copy.option(copy.labels[f], counts[f]),
    isDisabled: f !== 'ALL' && counts[f] === 0,
  }));
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line bg-surface px-4 pb-1 pt-3 shadow-panel">
      <div className="hidden sm:block">
        <SegmentedControl
          legend={copy.legend}
          hideLegend
          options={options}
          value={value}
          onChange={onChange}
        />
      </div>
      <Select
        className="sm:hidden"
        label={copy.legend}
        hideLabel
        options={options.map(({ id, label }) => ({ id, label }))}
        value={value}
        onChange={onChange}
      />
      <MinuteStrip markers={markers} />
    </div>
  );
}

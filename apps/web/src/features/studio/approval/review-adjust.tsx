'use client';

import { SegmentedControl } from '@/components/ui';
import {
  APPROVAL_COPY,
  DURATION_OPTIONS,
  PRIORITY_OPTIONS,
  PRIORITY_VALUES,
  type DurationChoice,
  type PriorityChoice,
} from '@/constants/approval';

export type Adjustments = {
  duration: DurationChoice;
  priority: PriorityChoice;
};

export const DEFAULT_ADJUSTMENTS: Adjustments = {
  duration: 0,
  priority: 'suggested',
};

/** The approval overrides the API accepts; absent fields keep the scheduled values. */
export const overridesOf = (
  adjust: Adjustments,
): { durationMs?: number; priority?: number } => ({
  ...(adjust.duration === 0 ? {} : { durationMs: adjust.duration }),
  ...(adjust.priority === 'suggested'
    ? {}
    : { priority: PRIORITY_VALUES[adjust.priority] }),
});

type ReviewAdjustProps = {
  value: Adjustments;
  onChange: (next: Adjustments) => void;
  disabled?: boolean;
};

/** Time on screen and priority, within the bounds the API enforces. */
export function ReviewAdjust({ value, onChange, disabled }: ReviewAdjustProps) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      <SegmentedControl
        legend={APPROVAL_COPY.durationLegend}
        options={DURATION_OPTIONS}
        value={value.duration}
        onChange={(duration) => onChange({ ...value, duration })}
        disabled={disabled}
      />
      <SegmentedControl
        legend={APPROVAL_COPY.priorityLegend}
        options={PRIORITY_OPTIONS}
        value={value.priority}
        onChange={(priority) => onChange({ ...value, priority })}
        disabled={disabled}
      />
    </div>
  );
}

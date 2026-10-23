'use client';

import { Button } from 'react-aria-components';
import {
  DATE_COPY,
  DATE_PRESET_LABELS,
  type DatePresetId,
} from '@/constants/ui';
import { cn } from '@/lib/cn';
import {
  type InstantRange,
  presetRange,
  type ZonedRange,
} from '@/lib/date-time';

type DatePresetsProps = {
  presets: readonly DatePresetId[];
  timeZone: string;
  matchWindow?: InstantRange | null;
  onPick: (range: ZonedRange) => void;
};

/** Relative ranges resolved at the moment they are picked. */
export function DatePresets({
  presets,
  timeZone,
  matchWindow,
  onPick,
}: DatePresetsProps) {
  return (
    <div
      role="group"
      aria-label={DATE_COPY.presets}
      className="flex flex-col gap-0.5 border-line pb-2 sm:min-w-40 sm:border-e sm:pb-0 sm:pe-2"
    >
      <p aria-hidden className="eyebrow px-2 pb-1">
        {DATE_COPY.presets}
      </p>
      {presets.map((id) => {
        const unavailable =
          id === 'thisMatch' && !presetRange(id, { timeZone, matchWindow });
        return (
          <Button
            key={id}
            slot={null}
            isDisabled={unavailable}
            onPress={() => {
              const range = presetRange(id, { timeZone, matchWindow });
              if (range) onPick(range);
            }}
            className={cn(
              'flex min-h-8 items-center rounded-md px-2 text-left text-[13px] text-ink outline-none pointer-coarse:min-h-11',
              'data-hovered:bg-surface-raised data-pressed:bg-surface-sunken data-focus-visible:outline-2 data-focus-visible:-outline-offset-2 data-focus-visible:outline-accent',
              'data-disabled:cursor-not-allowed data-disabled:text-ink-subtle',
            )}
          >
            {DATE_PRESET_LABELS[id]}
          </Button>
        );
      })}
    </div>
  );
}

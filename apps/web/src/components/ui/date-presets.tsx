'use client';

import { ToggleButton } from 'react-aria-components';
import { CheckIcon } from '@/components/icons';
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
  /** The preset the current value came from, if any. */
  active?: DatePresetId | null;
  onPick: (range: ZonedRange, id: DatePresetId) => void;
};

const ITEM = cn(
  'group/preset flex min-h-8 shrink-0 items-center gap-2 rounded-md px-2.5 text-start text-[13px] text-ink outline-none transition-colors duration-150 pointer-coarse:min-h-11',
  'max-sm:border max-sm:border-line-strong max-sm:bg-surface',
  'data-hovered:bg-surface-raised data-pressed:bg-surface-sunken',
  'data-selected:bg-accent-soft data-selected:font-semibold data-selected:text-accent max-sm:data-selected:border-accent/40',
  'data-focus-visible:outline-2 data-focus-visible:-outline-offset-2 data-focus-visible:outline-accent',
  'data-disabled:cursor-not-allowed data-disabled:text-ink-subtle data-disabled:opacity-60',
);

/** Relative ranges, resolved at the moment they are picked; one tap applies. */
export function DatePresets({
  presets,
  timeZone,
  matchWindow,
  active,
  onPick,
}: DatePresetsProps) {
  return (
    <div
      role="group"
      aria-label={DATE_COPY.presets}
      className={cn(
        'flex gap-1.5 overflow-x-auto p-3 [scrollbar-width:none]',
        'sm:w-44 sm:shrink-0 sm:flex-col sm:gap-0.5 sm:overflow-visible sm:border-e sm:border-line sm:bg-surface-raised/50 sm:p-2',
      )}
    >
      <p aria-hidden className="eyebrow hidden px-2.5 pb-1.5 pt-1.5 sm:block">
        {DATE_COPY.presets}
      </p>
      {presets.map((id) => {
        const unavailable =
          id === 'thisMatch' && !presetRange(id, { timeZone, matchWindow });
        return (
          <ToggleButton
            key={id}
            isSelected={active === id}
            isDisabled={unavailable}
            onChange={() => {
              const range = presetRange(id, { timeZone, matchWindow });
              if (range) onPick(range, id);
            }}
            className={ITEM}
          >
            <span className="flex-1 whitespace-nowrap">
              {DATE_PRESET_LABELS[id]}
            </span>
            <CheckIcon
              size={14}
              className="hidden shrink-0 group-data-selected/preset:block"
            />
          </ToggleButton>
        );
      })}
    </div>
  );
}

/** Class strings for `calendar*.tsx`; data attributes come from React Aria. */

export const CALENDAR_NAV =
  'flex size-8 items-center justify-center rounded-md text-ink-muted outline-none transition-colors duration-150 pointer-coarse:size-11 data-hovered:bg-surface-raised data-hovered:text-ink data-pressed:bg-surface-sunken data-focus-visible:outline-2 data-focus-visible:outline-offset-1 data-focus-visible:outline-accent data-disabled:pointer-events-none data-disabled:opacity-35';

export const CALENDAR_TITLE =
  'flex h-8 items-center gap-1 rounded-md ps-2 pe-1.5 text-sm font-semibold tracking-tight text-ink outline-none transition-colors duration-150 pointer-coarse:h-11 data-hovered:bg-surface-raised data-pressed:bg-surface-sunken data-focus-visible:outline-2 data-focus-visible:outline-offset-1 data-focus-visible:outline-accent';

/** Zero horizontal spacing keeps the range band continuous across a week. */
export const CALENDAR_GRID =
  'border-separate border-spacing-x-0 border-spacing-y-0.5';

export const WEEKDAY =
  'h-8 w-10 pb-1 text-center text-micro font-medium text-ink-subtle pointer-coarse:w-11';

/** The outer cell carries the band; the inner pill carries the day state. */
export const DAY_CELL =
  'group/day relative flex size-10 cursor-pointer items-center justify-center outline-none pointer-coarse:size-11 data-disabled:cursor-default data-disabled:not-data-outside-month:opacity-40 data-unavailable:cursor-not-allowed';

export const DAY_BAND =
  'data-selected:not-data-outside-month:bg-accent-band data-selection-start:rounded-s-lg data-selection-end:rounded-e-lg [td:first-child>&]:rounded-s-lg [td:last-child>&]:rounded-e-lg';

export const PILL_BASE =
  'relative flex size-9 items-center justify-center rounded-lg text-[13px] tabular transition-[background-color,color,box-shadow] duration-150 ease-out pointer-coarse:size-10';

/** One entry per visual state; `dayPillClass` picks exactly one tone. */
export const PILL_TONE = {
  chosen:
    'bg-accent font-semibold text-accent-ink shadow-[0_1px_2px_0_var(--mq-shade)]',
  chosenHover: 'bg-accent-strong font-semibold text-accent-ink',
  today:
    'font-semibold text-accent shadow-[inset_0_0_0_1.5px_var(--mq-accent)]',
  muted: 'text-ink-subtle',
  struck: 'text-ink-subtle line-through decoration-1',
  idle: 'text-ink',
} as const;

export const PILL_HOVER = 'bg-ink/6';
export const PILL_PRESSED = 'bg-ink/10';
export const PILL_FOCUS = 'outline-2 outline-offset-1 outline-accent';

export const DAY_MARKER =
  'pointer-events-none absolute bottom-1 start-1/2 size-1 -translate-x-1/2 rounded-full rtl:translate-x-1/2';

export const MONTH_TILE =
  'flex h-10 items-center justify-center rounded-lg text-[13px] text-ink outline-none transition-colors duration-150 pointer-coarse:h-11 data-hovered:bg-surface-raised data-pressed:bg-surface-sunken data-focus-visible:outline-2 data-focus-visible:outline-offset-1 data-focus-visible:outline-accent data-selected:bg-accent data-selected:font-semibold data-selected:text-accent-ink data-disabled:opacity-40';

export const CALENDAR_LEGEND =
  'mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line pt-2 text-micro text-ink-subtle';

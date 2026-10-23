export type ControlSize = 'sm' | 'md';

/** 32/40px on fine pointers, 44px on touch (WCAG 2.5.8 and platform guidance). */
export const CONTROL_HEIGHT: Record<ControlSize, string> = {
  sm: 'h-8 text-[13px] pointer-coarse:h-11',
  md: 'h-10 text-sm pointer-coarse:h-11',
};

export const CONTROL_PADDING: Record<ControlSize, string> = {
  sm: 'px-2.5',
  md: 'px-3',
};

/** One focus treatment everywhere: a 2px accent ring, offset from the control. */
export const FOCUS_RING =
  'outline-none data-focus-visible:outline-2 data-focus-visible:outline-offset-2 data-focus-visible:outline-accent';

/** Trigger-like controls (select, combobox shell, text input). */
export const CONTROL_SURFACE =
  'rounded-md border border-line-strong bg-surface text-ink shadow-panel transition-[border-color,background-color,box-shadow,color] duration-150 ease-out';

export const CONTROL_INTERACTIVE =
  'data-hovered:border-control data-pressed:bg-surface-raised data-disabled:cursor-not-allowed data-disabled:border-line data-disabled:bg-surface-raised data-disabled:text-ink-subtle data-disabled:shadow-none';

/** Typing focus: the border turns accent and a soft halo appears (mouse and keyboard alike). */
export const CONTROL_FOCUSED =
  'data-focused:border-accent data-focused:ring-3 data-focused:ring-accent/15 data-focus-within:border-accent data-focus-within:ring-3 data-focus-within:ring-accent/15';

/** Applied on a field root marked `group`; RAC sets `data-invalid` there. */
export const CONTROL_INVALID =
  'group-data-invalid:border-critical group-data-invalid:ring-3 group-data-invalid:ring-critical/12';

export const TEXT_INPUT =
  'min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-ink-subtle disabled:cursor-not-allowed';

/** Floating surfaces share radius, border, elevation and inner padding. */
export const OVERLAY_SURFACE =
  'rounded-lg border border-line-strong bg-surface text-ink shadow-float outline-none';

/** Scale and fade from the trigger; global CSS clamps it under reduced motion. */
export const OVERLAY_MOTION =
  'origin-(--trigger-anchor-point) data-entering:animate-[overlay-in_120ms_var(--ease-broadcast)] data-exiting:animate-[overlay-out_100ms_ease-in] motion-reduce:animate-none';

/**
 * List rows: hover and keyboard highlight are neutral, the keyboard adds an
 * inset accent ring, and the selected row is tinted with a check mark.
 */
export const LIST_ITEM =
  'group/item relative flex cursor-default select-none items-start gap-2.5 rounded-md px-2.5 py-2 text-[13px] text-ink outline-none transition-colors duration-100 pointer-coarse:min-h-11 data-hovered:bg-ink/5 data-focused:bg-ink/5 data-pressed:bg-ink/8 data-selected:bg-accent-soft data-selected:data-focused:bg-accent/15 data-disabled:cursor-not-allowed data-focus-visible:outline-2 data-focus-visible:-outline-offset-2 data-focus-visible:outline-accent';

export const SECTION_HEADER = 'eyebrow px-2.5 pb-1.5 pt-2 text-ink-subtle';

/** Between listbox groups. */
export const SECTION_DIVIDER =
  'not-first:mt-1 not-first:border-t not-first:border-line not-first:pt-1';

export const LABEL = 'eyebrow';
export const HELP_TEXT = 'text-micro text-ink-subtle';
export const ERROR_TEXT =
  'flex items-start gap-1 text-micro font-medium text-critical';

/** Button-style field triggers (date pickers): an icon well, a summary and an end affordance. */
export const TRIGGER =
  'flex w-full min-w-0 items-center gap-2.5 rounded-md border bg-surface ps-1.5 text-start text-ink shadow-panel outline-none transition-[border-color,background-color,box-shadow] duration-150 ease-out data-focus-visible:outline-2 data-focus-visible:outline-offset-2 data-focus-visible:outline-accent aria-expanded:border-accent aria-expanded:ring-3 aria-expanded:ring-accent/15 data-disabled:cursor-not-allowed data-disabled:bg-surface-raised data-disabled:text-ink-subtle data-disabled:shadow-none';

export const TRIGGER_TONE = {
  default: 'border-line-strong data-hovered:border-control',
  invalid: 'border-critical ring-3 ring-critical/12',
} as const;

export const ICON_WELL_BASE =
  'flex shrink-0 items-center justify-center border transition-colors duration-150';

export const ICON_WELL: Record<ControlSize, string> = {
  sm: 'size-6 rounded-[5px]',
  md: 'size-7 rounded-md',
};

export const ICON_WELL_TONE = {
  empty: 'border-line bg-surface-raised text-ink-subtle',
  filled: 'border-accent/25 bg-accent-soft text-accent',
} as const;

/** Icon-only button inside a control (clear, step). */
export const INLINE_ACTION =
  'flex size-6 shrink-0 items-center justify-center rounded-[5px] text-ink-subtle outline-none transition-colors duration-150 pointer-coarse:size-10 data-hovered:bg-surface-raised data-hovered:text-ink data-pressed:bg-surface-sunken data-focus-visible:outline-2 data-focus-visible:outline-offset-1 data-focus-visible:outline-accent';

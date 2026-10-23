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

export const FOCUS_RING =
  'outline-none data-focus-visible:outline-2 data-focus-visible:outline-offset-1 data-focus-visible:outline-accent';

/** Trigger-like controls (select, date field, combobox shell). */
export const CONTROL_SURFACE =
  'rounded-md border border-line-strong bg-surface text-ink shadow-panel transition-[border-color,background-color,box-shadow] duration-150 ease-out';

export const CONTROL_INTERACTIVE =
  'data-hovered:border-control data-pressed:bg-surface-raised data-disabled:cursor-not-allowed data-disabled:opacity-50';

/** Applied on a field root marked `group`; RAC sets `data-invalid` there. */
export const CONTROL_INVALID =
  'group-data-invalid:border-critical group-data-invalid:shadow-[0_0_0_1px_var(--mq-critical)]';

export const TEXT_INPUT =
  'min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-ink-subtle disabled:cursor-not-allowed';

export const OVERLAY_SURFACE =
  'rounded-lg border border-line-strong bg-surface text-ink shadow-float outline-none';

/** Entering/exiting states are set by React Aria; global CSS clamps them under reduced motion. */
export const OVERLAY_MOTION =
  'data-entering:animate-[overlay-in_160ms_var(--ease-broadcast)] data-exiting:animate-[overlay-out_120ms_ease-in] motion-reduce:animate-none';

export const LIST_ITEM =
  'group/item relative flex cursor-default select-none items-start gap-2.5 rounded-md px-2.5 py-2 text-[13px] text-ink outline-none pointer-coarse:min-h-11 data-focused:bg-surface-raised data-hovered:bg-surface-raised data-pressed:bg-surface-sunken data-disabled:cursor-not-allowed data-focus-visible:outline-2 data-focus-visible:-outline-offset-2 data-focus-visible:outline-accent';

export const SECTION_HEADER =
  'eyebrow px-2.5 pb-1 pt-2.5 first:pt-1 text-ink-subtle';

export const LABEL = 'eyebrow';
export const HELP_TEXT = 'text-micro text-ink-subtle';
export const ERROR_TEXT =
  'flex items-start gap-1 text-micro font-medium text-critical';

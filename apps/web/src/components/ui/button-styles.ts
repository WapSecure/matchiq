export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'xs' | 'sm' | 'md';

export const BUTTON_BASE =
  'press inline-flex select-none items-center justify-center whitespace-nowrap rounded-md font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-45 [&_svg]:shrink-0';

export const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-accent-ink shadow-[inset_0_1px_0_0_rgb(255_255_255/0.16),0_1px_2px_0_var(--mq-shade)] hover:bg-accent-strong active:brightness-95',
  secondary:
    'border border-line-strong bg-surface text-ink shadow-panel hover:border-control hover:bg-surface-raised active:bg-surface-sunken',
  ghost: 'text-ink-muted hover:bg-ink/5 hover:text-ink active:bg-ink/8',
  danger:
    'border border-critical/45 bg-critical/10 text-critical shadow-panel hover:border-critical/70 hover:bg-critical/15',
};

export const BUTTON_SIZES: Record<ButtonSize, string> = {
  xs: 'h-7 gap-1 px-2 text-xs',
  sm: 'h-8 gap-1.5 px-3 text-[13px] pointer-coarse:min-h-11',
  md: 'h-10 gap-2 px-4 text-sm pointer-coarse:min-h-11',
};

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'xs' | 'sm' | 'md';

export const BUTTON_BASE =
  'press inline-flex select-none items-center justify-center whitespace-nowrap rounded-md font-medium disabled:pointer-events-none disabled:opacity-50';

export const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-accent-ink shadow-panel hover:bg-accent-strong active:brightness-95',
  secondary:
    'border border-line-strong bg-surface text-ink shadow-panel hover:border-control hover:bg-surface-raised',
  ghost: 'text-ink-muted hover:bg-surface-raised hover:text-ink',
};

export const BUTTON_SIZES: Record<ButtonSize, string> = {
  xs: 'h-7 gap-1 px-2 text-xs',
  sm: 'h-8 gap-1.5 px-3 text-[13px]',
  md: 'h-10 gap-2 px-4 text-sm',
};

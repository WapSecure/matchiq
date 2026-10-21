import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'neutral' | 'accent' | 'synthetic';

const TONES: Record<Tone, string> = {
  neutral: 'border-line-strong bg-surface-raised text-ink-muted',
  accent: 'border-accent/30 bg-accent-soft text-accent-strong',
  synthetic: 'border-synthetic/30 bg-synthetic-soft text-synthetic',
};

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: Tone;
  dot?: boolean;
  children: ReactNode;
};

export function Badge({
  tone = 'neutral',
  dot = false,
  className,
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={cn(
        'eyebrow inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5',
        TONES[tone],
        className,
      )}
      {...rest}
    >
      {dot ? (
        <span aria-hidden className="size-1.5 rounded-full bg-current" />
      ) : null}
      {children}
    </span>
  );
}

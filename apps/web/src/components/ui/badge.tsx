import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type BadgeTone =
  | 'neutral'
  | 'accent'
  | 'synthetic'
  | 'onair'
  | 'warning'
  | 'positive'
  | 'critical';

const TONES: Record<BadgeTone, string> = {
  neutral: 'border-line-strong bg-surface-raised text-ink-muted',
  accent: 'border-accent/30 bg-accent-soft text-accent-strong',
  synthetic: 'border-synthetic/30 bg-synthetic-soft text-synthetic',
  onair: 'border-onair/40 bg-onair/10 text-ink',
  warning: 'border-warning/35 bg-warning/10 text-warning',
  positive: 'border-positive/30 bg-positive/10 text-positive',
  critical: 'border-critical/40 bg-critical/10 text-critical',
};

const DOT: Partial<Record<BadgeTone, string>> = {
  onair: 'bg-onair motion-safe:animate-[tally_1.6s_ease-in-out_infinite]',
};

export const badgeClassName = (tone: BadgeTone, className?: string): string =>
  cn(
    'eyebrow inline-flex h-5 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[5px] border px-1.5',
    TONES[tone],
    className,
  );

export const BadgeDot = ({ tone }: { tone: BadgeTone }) => (
  <span
    aria-hidden
    className={cn('size-1.5 rounded-full', DOT[tone] ?? 'bg-current')}
  />
);

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
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
    <span className={badgeClassName(tone, className)} {...rest}>
      {dot ? <BadgeDot tone={tone} /> : null}
      {children}
    </span>
  );
}

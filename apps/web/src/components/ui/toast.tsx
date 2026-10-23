'use client';

import type { ComponentType, ReactNode } from 'react';
import { CloseIcon, type IconProps } from '@/components/icons';
import { cn } from '@/lib/cn';
import { Button } from './button';

export type ToastTone = 'neutral' | 'positive' | 'warning' | 'critical';

/** A tone rail on the leading edge and a tinted icon well carry the meaning; text stays ink. */
const TONE: Record<ToastTone, { rail: string; icon: string }> = {
  neutral: { rail: 'before:bg-control', icon: 'bg-ink/6 text-ink-muted' },
  positive: {
    rail: 'before:bg-positive',
    icon: 'bg-positive/12 text-positive',
  },
  warning: { rail: 'before:bg-warning', icon: 'bg-warning/14 text-warning' },
  critical: {
    rail: 'before:bg-critical',
    icon: 'bg-critical/12 text-critical',
  },
};

type ToastCardProps = {
  children: ReactNode;
  tone?: ToastTone;
  Icon?: ComponentType<IconProps>;
  /** Buttons such as "Reload"; keep to one. */
  action?: ReactNode;
  onDismiss?: () => void;
  dismissLabel?: string;
  /** Names the toast when it is a landmark-like section. */
  label?: string;
  className?: string;
};

/**
 * The visual toast. Callers own the live region (`role="status"`) and the
 * timing, because what to announce and when differs per message.
 */
export function ToastCard({
  children,
  tone = 'neutral',
  Icon,
  action,
  onDismiss,
  dismissLabel,
  label,
  className,
}: ToastCardProps) {
  return (
    <section
      aria-label={label}
      className={cn(
        'pointer-events-auto relative flex max-w-sm items-center gap-3 overflow-hidden rounded-lg border border-line-strong bg-surface py-2.5 ps-4 pe-2 text-[13px] leading-snug text-ink shadow-float',
        'before:absolute before:inset-y-0 before:start-0 before:w-[3px]',
        'motion-safe:animate-[overlay-in_180ms_var(--ease-broadcast)]',
        TONE[tone].rail,
        className,
      )}
    >
      {Icon ? (
        <span
          aria-hidden
          className={cn(
            'flex size-7 shrink-0 items-center justify-center rounded-full',
            TONE[tone].icon,
          )}
        >
          <Icon size={15} />
        </span>
      ) : null}
      <div className="min-w-0 flex-1">{children}</div>
      {action}
      {onDismiss ? (
        <Button
          iconOnly
          size="xs"
          variant="ghost"
          aria-label={dismissLabel}
          onClick={onDismiss}
          leadingIcon={<CloseIcon size={14} />}
          className="pointer-coarse:size-11"
        />
      ) : null}
    </section>
  );
}

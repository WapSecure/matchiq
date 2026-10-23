'use client';

import type { ComponentType, ReactNode } from 'react';
import { CloseIcon, type IconProps } from '@/components/icons';
import { cn } from '@/lib/cn';
import { Button } from './button';

export type ToastTone = 'neutral' | 'positive' | 'warning' | 'critical';

const TONE: Record<ToastTone, { border: string; icon: string }> = {
  neutral: { border: 'border-line-strong', icon: 'text-ink-subtle' },
  positive: { border: 'border-positive/45', icon: 'text-positive' },
  warning: { border: 'border-warning/45', icon: 'text-warning' },
  critical: { border: 'border-critical/50', icon: 'text-critical' },
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
        'pointer-events-auto flex max-w-sm items-center gap-2.5 rounded-lg border bg-surface py-2 pl-3 pr-1.5 text-[13px] text-ink shadow-float',
        'motion-safe:animate-[overlay-in_200ms_var(--ease-broadcast)]',
        TONE[tone].border,
        className,
      )}
    >
      {Icon ? (
        <Icon size={16} className={cn('shrink-0', TONE[tone].icon)} />
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

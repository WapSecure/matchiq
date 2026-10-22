import type { ComponentType, ReactNode } from 'react';
import type { IconProps } from '@/components/icons';
import { cn } from '@/lib/cn';

type EmptyStateProps = {
  title: string;
  description?: ReactNode;
  Icon?: ComponentType<IconProps>;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
};

export function EmptyState({
  title,
  description,
  Icon,
  action,
  compact = false,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact
          ? 'gap-2 px-4 py-8'
          : 'gap-3 rounded-lg border border-dashed border-line-strong bg-surface/60 px-6 py-14',
        className,
      )}
    >
      {Icon ? (
        <span
          className={cn(
            'flex items-center justify-center rounded-full border border-line bg-surface-raised text-ink-subtle',
            compact ? 'size-8' : 'size-11',
          )}
        >
          <Icon size={compact ? 15 : 20} />
        </span>
      ) : null}
      <p
        className={cn(
          'font-medium text-ink',
          compact ? 'text-[13px]' : 'text-sm',
        )}
      >
        {title}
      </p>
      {description ? (
        <p className="max-w-sm text-xs leading-relaxed text-ink-subtle">
          {description}
        </p>
      ) : null}
      {action}
    </div>
  );
}

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
          ? 'gap-1.5 py-6'
          : 'gap-3 rounded-lg border border-dashed border-line-strong px-6 py-12',
        className,
      )}
    >
      {Icon ? (
        <Icon size={compact ? 18 : 22} className="text-ink-subtle" />
      ) : null}
      <p
        className={cn('font-medium text-ink', compact ? 'text-xs' : 'text-sm')}
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

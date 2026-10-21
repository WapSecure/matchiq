import type { ComponentType, ReactNode } from 'react';
import type { IconProps } from '@/components/icons';
import { cn } from '@/lib/cn';

type FeatureCardProps = {
  title: string;
  description: ReactNode;
  Icon: ComponentType<IconProps>;
  index?: number;
  className?: string;
};

const INDEX_PAD = 2;

export function FeatureCard({
  title,
  description,
  Icon,
  index,
  className,
}: FeatureCardProps) {
  return (
    <article
      className={cn(
        'group relative flex flex-col rounded-lg border border-line bg-surface p-5 transition-colors hover:border-line-strong',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="flex size-9 items-center justify-center rounded-md border border-line bg-surface-raised text-accent">
          <Icon size={18} />
        </span>
        {index === undefined ? null : (
          <span className="tabular font-mono text-xs text-ink-subtle">
            {String(index).padStart(INDEX_PAD, '0')}
          </span>
        )}
      </div>
      <h3 className="mt-4 text-sm font-semibold text-ink">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
        {description}
      </p>
    </article>
  );
}

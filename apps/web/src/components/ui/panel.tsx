import type { ComponentType, ReactNode } from 'react';
import type { IconProps } from '@/components/icons';
import { cn } from '@/lib/cn';

type PanelProps = {
  id: string;
  title: string;
  description?: string;
  Icon?: ComponentType<IconProps>;
  actions?: ReactNode;
  className?: string;
  bodyClassName?: string;
  /** Body scrolls internally; made focusable so keyboard users can scroll it. */
  scrollable?: boolean;
  children: ReactNode;
};

/** Titled console region; the heading names the landmark for AT. */
export function Panel({
  id,
  title,
  description,
  Icon,
  actions,
  className,
  bodyClassName,
  scrollable = false,
  children,
}: PanelProps) {
  const headingId = `${id}-title`;
  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        'flex min-w-0 flex-col rounded-lg border border-line bg-surface',
        className,
      )}
    >
      <header className="flex min-h-11 items-center justify-between gap-3 border-b border-line px-4 py-2">
        <div className="flex min-w-0 items-center gap-2">
          {Icon ? (
            <Icon size={16} className="shrink-0 text-ink-subtle" />
          ) : null}
          <div className="min-w-0">
            <h2
              id={headingId}
              className="truncate text-[13px] font-semibold tracking-tight text-ink"
            >
              {title}
            </h2>
            {description ? (
              <p className="truncate text-xs text-ink-subtle">{description}</p>
            ) : null}
          </div>
        </div>
        {actions ? (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        ) : null}
      </header>
      <div
        tabIndex={scrollable ? 0 : undefined}
        aria-labelledby={scrollable ? headingId : undefined}
        role={scrollable ? 'group' : undefined}
        className={cn(
          'min-w-0 flex-1 p-4',
          scrollable && 'overflow-y-auto',
          bodyClassName,
        )}
      >
        {children}
      </div>
    </section>
  );
}

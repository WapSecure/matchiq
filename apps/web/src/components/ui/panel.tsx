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
        'flex min-w-0 flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-panel',
        className,
      )}
    >
      <header className="flex min-h-12 shrink-0 items-center justify-between gap-3 border-b border-line px-4 py-2">
        <div className="flex min-w-0 items-center gap-2.5">
          {Icon ? (
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md border border-line bg-surface-raised text-ink-muted">
              <Icon size={14} />
            </span>
          ) : null}
          <div className="min-w-0">
            <h2
              id={headingId}
              className="break-words text-[13px] font-semibold leading-5 tracking-tight text-ink"
            >
              {title}
            </h2>
            {description ? (
              <p className="break-words text-xs leading-4 text-ink-subtle">
                {description}
              </p>
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
          scrollable &&
            'overflow-y-auto overscroll-contain focus-visible:-outline-offset-2',
          bodyClassName,
        )}
      >
        {children}
      </div>
    </section>
  );
}

import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function GallerySection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 border-t border-line pt-6 first:border-t-0 first:pt-0">
      <h3 className="text-sm font-semibold tracking-tight text-ink">{title}</h3>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {children}
      </div>
    </section>
  );
}

/** One component in one state, captioned so screenshots are self-explanatory. */
export function Specimen({
  state,
  children,
  wide = false,
}: {
  state: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <figure
      className={cn(
        'flex min-w-0 flex-col gap-3 rounded-lg border border-line bg-surface p-4 shadow-panel',
        wide && 'md:col-span-2',
      )}
    >
      <figcaption className="eyebrow text-ink-subtle">{state}</figcaption>
      <div className="flex min-w-0 flex-col gap-3">{children}</div>
    </figure>
  );
}

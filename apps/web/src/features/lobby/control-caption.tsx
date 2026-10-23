import type { ReactNode } from 'react';

/**
 * Visible caption above a start control. The control carries a per-match
 * accessible label, so the caption is hidden from assistive tech.
 */
export function ControlCaption({
  text,
  children,
}: {
  text: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex h-6 items-center gap-1">
      <p aria-hidden className="eyebrow text-ink-subtle">
        {text}
      </p>
      {children}
    </div>
  );
}

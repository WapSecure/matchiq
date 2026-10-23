'use client';

import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { type BadgeTone, BadgeDot, badgeClassName } from './badge';
import { Tooltip } from './tooltip';

type HintBadgeProps = Omit<HTMLAttributes<HTMLButtonElement>, 'children'> & {
  tone?: BadgeTone;
  dot?: boolean;
  /** Explains the badge on hover and focus, and to screen readers. */
  hint: string;
  children: ReactNode;
};

/**
 * A badge that explains itself. It is a focusable button so keyboard users
 * reach the tooltip; the 24px hit area meets WCAG 2.5.8 around a 20px badge.
 */
export function HintBadge({
  tone = 'neutral',
  dot = false,
  hint,
  children,
  className,
  ...rest
}: HintBadgeProps) {
  return (
    <Tooltip content={hint}>
      <button
        type="button"
        {...rest}
        className={cn(
          'group/hint inline-flex min-h-6 shrink-0 cursor-help items-center rounded-md outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent',
          className,
        )}
      >
        <span
          className={badgeClassName(
            tone,
            'underline decoration-dotted decoration-1 underline-offset-2 group-hover/hint:decoration-solid',
          )}
        >
          {dot ? <BadgeDot tone={tone} /> : null}
          <span>{children}</span>
          <span className="sr-only">: {hint}</span>
        </span>
      </button>
    </Tooltip>
  );
}

'use client';

import type { ReactNode } from 'react';
import { AlertIcon, CalendarIcon, ChevronDownIcon } from '@/components/icons';
import { cn } from '@/lib/cn';
import {
  type ControlSize,
  ERROR_TEXT,
  HELP_TEXT,
  ICON_WELL,
  ICON_WELL_BASE,
  ICON_WELL_TONE,
} from './control-styles';

/** Icon well, summary or placeholder, and the open affordance. */
export function TriggerContent({
  size,
  summary,
  placeholder,
  valueId,
  showChevron,
}: {
  size: ControlSize;
  summary: string | null;
  placeholder: string;
  valueId: string;
  showChevron: boolean;
}) {
  const filled = summary !== null;
  return (
    <>
      <span
        aria-hidden
        className={cn(
          ICON_WELL_BASE,
          ICON_WELL[size],
          filled ? ICON_WELL_TONE.filled : ICON_WELL_TONE.empty,
        )}
      >
        <CalendarIcon size={size === 'md' ? 15 : 13} />
      </span>
      <span
        id={valueId}
        className={cn(
          'min-w-0 flex-1 truncate tabular',
          filled ? 'font-medium text-ink' : 'text-ink-subtle',
        )}
      >
        {summary ?? placeholder}
      </span>
      {showChevron ? (
        <ChevronDownIcon
          size={14}
          className="shrink-0 text-ink-subtle transition-transform duration-150 in-aria-expanded:rotate-180"
        />
      ) : null}
    </>
  );
}

export function Messages({
  ids,
  description,
  errorMessage,
}: {
  ids: { help: string; error: string };
  description?: ReactNode;
  errorMessage?: string;
}) {
  return (
    <>
      {description ? (
        <p id={ids.help} className={HELP_TEXT}>
          {description}
        </p>
      ) : null}
      {errorMessage ? (
        <p id={ids.error} className={ERROR_TEXT}>
          <AlertIcon size={12} className="mt-0.5 shrink-0" />
          <span>{errorMessage}</span>
        </p>
      ) : null}
    </>
  );
}

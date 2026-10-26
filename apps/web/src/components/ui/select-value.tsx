'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { ICON_WELL, ICON_WELL_BASE, ICON_WELL_TONE } from './control-styles';
import type { ChoiceOption } from './option-item';

/** Trigger content: icon well, the label and, when asked, the description in a quieter tone. */
export function SelectedValue<K extends string>({
  option,
  placeholder,
  showDescription = false,
}: {
  option: ChoiceOption<K> | undefined;
  placeholder: string;
  showDescription?: boolean;
}): ReactNode {
  if (!option)
    return <span className="truncate text-ink-subtle">{placeholder}</span>;
  const described = showDescription && Boolean(option.description);
  return (
    <span className="flex min-w-0 items-center gap-2">
      {option.icon ? (
        <span
          aria-hidden
          className={cn(ICON_WELL_BASE, ICON_WELL.sm, ICON_WELL_TONE.filled)}
        >
          {option.icon}
        </span>
      ) : null}
      <span
        lang={option.lang}
        aria-hidden={option.short ? true : undefined}
        className={cn(
          'min-w-0 truncate font-medium',
          described && 'max-w-[70%] shrink-0',
        )}
      >
        {option.short ?? option.label}
      </span>
      {option.short ? (
        <span lang={option.lang} className="sr-only">
          {`${option.short} ${option.label}`}
        </span>
      ) : null}
      {described ? (
        <span className="hidden min-w-0 flex-1 truncate text-ink-subtle sm:inline">
          {option.description}
        </span>
      ) : null}
    </span>
  );
}

'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { ICON_WELL, ICON_WELL_BASE, ICON_WELL_TONE } from './control-styles';
import type { ChoiceOption } from './option-item';

/** Trigger content: icon well, the label, then the description in a quieter tone. */
export function SelectedValue<K extends string>({
  option,
  placeholder,
}: {
  option: ChoiceOption<K> | undefined;
  placeholder: string;
}): ReactNode {
  if (!option)
    return <span className="truncate text-ink-subtle">{placeholder}</span>;
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
      <span className="max-w-[70%] shrink-0 truncate font-medium">
        {option.label}
      </span>
      {option.description ? (
        <span className="hidden min-w-0 flex-1 truncate text-ink-subtle sm:inline">
          {option.description}
        </span>
      ) : null}
    </span>
  );
}

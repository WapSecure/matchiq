'use client';

import { KeyboardIcon } from '@/components/icons';
import { Button, PopoverPanel, PopoverTrigger, Switch } from '@/components/ui';
import { SHORTCUTS_COPY } from '@/constants/approval-shortcuts';

type Props = {
  enabled: boolean;
  onEnabledChange: (on: boolean) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** The shortcuts switch and the list of keys; `?` on a graphic opens it too. */
export function ShortcutsHelp({
  enabled,
  onEnabledChange,
  open,
  onOpenChange,
}: Props) {
  return (
    <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-1">
      <Switch isSelected={enabled} onChange={onEnabledChange}>
        {SHORTCUTS_COPY.switchLabel}
      </Switch>
      <PopoverTrigger isOpen={open} onOpenChange={onOpenChange}>
        <Button
          size="xs"
          variant="ghost"
          leadingIcon={<KeyboardIcon size={14} />}
        >
          {SHORTCUTS_COPY.helpButton}
        </Button>
        <PopoverPanel title={SHORTCUTS_COPY.helpTitle} placement="bottom end">
          <p className="mb-2">{SHORTCUTS_COPY.helpIntro}</p>
          <ul className="flex flex-col gap-1.5">
            {SHORTCUTS_COPY.rows.map((row) => (
              <li key={row.label} className="flex items-center gap-2">
                <span className="flex w-16 shrink-0 gap-1 text-ink">
                  {row.keys.map((key) => (
                    <kbd
                      key={key}
                      className="inline-flex min-w-5 items-center justify-center rounded-[4px] border border-line-strong bg-surface-raised px-1 font-sans text-[11px] font-semibold"
                    >
                      {key}
                    </kbd>
                  ))}
                </span>
                <span>{row.label}</span>
              </li>
            ))}
          </ul>
        </PopoverPanel>
      </PopoverTrigger>
    </div>
  );
}

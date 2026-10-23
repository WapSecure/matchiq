'use client';

import { type ReactNode, type SyntheticEvent, useId } from 'react';
import { CloseIcon } from '@/components/icons';
import { Button } from './button';
import { useNativeDialog } from './use-native-dialog';

type DrawerProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  closeLabel: string;
  children: ReactNode;
};

/** Modal side sheet on native `<dialog>` (see `useNativeDialog`). */
export function Drawer({
  open,
  onClose,
  title,
  eyebrow,
  closeLabel,
  children,
}: DrawerProps) {
  const ref = useNativeDialog(open);
  const titleId = useId();

  const onCancel = (event: SyntheticEvent) => {
    event.preventDefault();
    onClose();
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={onCancel}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-dvh w-full max-w-lg border-l border-line-strong bg-surface p-0 text-ink shadow-float backdrop:bg-canvas/70 backdrop:backdrop-blur-[2px] motion-safe:open:animate-[sheet-in_240ms_var(--ease-broadcast)]"
    >
      {open ? (
        <div className="flex h-full flex-col">
          <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div className="min-w-0">
              {eyebrow ? (
                <p className="eyebrow text-accent">{eyebrow}</p>
              ) : null}
              <h2
                id={titleId}
                className="mt-1 text-base font-semibold leading-snug text-ink"
              >
                {title}
              </h2>
            </div>
            <Button
              iconOnly
              variant="ghost"
              aria-label={closeLabel}
              onClick={onClose}
              leadingIcon={<CloseIcon size={16} />}
            />
          </header>
          <div
            tabIndex={0}
            role="group"
            aria-labelledby={titleId}
            className="flex-1 overflow-y-auto px-5 py-4"
          >
            {children}
          </div>
        </div>
      ) : null}
    </dialog>
  );
}

'use client';

import type { ComponentType, ReactNode, SyntheticEvent } from 'react';
import { useId } from 'react';
import type { IconProps } from '@/components/icons';
import { cn } from '@/lib/cn';
import { useNativeDialog } from './use-native-dialog';

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  Icon?: ComponentType<IconProps>;
  tone?: 'default' | 'danger';
  children: ReactNode;
};

/** Centred modal on native `<dialog>` (see `useNativeDialog`). */
export function Modal({
  open,
  onClose,
  title,
  description,
  Icon,
  tone = 'default',
  children,
}: ModalProps) {
  const ref = useNativeDialog(open);
  const titleId = useId();
  const descriptionId = useId();
  const onCancel = (event: SyntheticEvent) => {
    event.preventDefault();
    onClose();
  };
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={onCancel}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-lg border border-line-strong bg-surface p-0 text-ink shadow-2xl backdrop:bg-canvas/70 backdrop:backdrop-blur-[2px]"
    >
      {open ? (
        <div className="flex flex-col gap-4 p-5">
          <header className="flex items-start gap-3">
            {Icon ? (
              <span
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-md border',
                  tone === 'danger'
                    ? 'border-critical/40 bg-critical/10 text-critical'
                    : 'border-line bg-surface-raised text-ink-muted',
                )}
              >
                <Icon size={16} />
              </span>
            ) : null}
            <div className="min-w-0">
              <h2
                id={titleId}
                className="text-base font-semibold leading-snug text-ink"
              >
                {title}
              </h2>
              {description ? (
                <p
                  id={descriptionId}
                  className="mt-1 text-[13px] leading-relaxed text-ink-muted"
                >
                  {description}
                </p>
              ) : null}
            </div>
          </header>
          {children}
        </div>
      ) : null}
    </dialog>
  );
}

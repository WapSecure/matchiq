'use client';

import { useEffect, useRef } from 'react';
import { AlertIcon, CheckIcon, CloseIcon } from '@/components/icons';
import {
  SETTLED_COPY,
  SETTLED_VISIBLE_MS,
} from '@/constants/approval-shortcuts';
import { cn } from '@/lib/cn';
import type { Settled } from './use-settled-reviews';

const ICONS = {
  APPROVED: CheckIcon,
  REJECTED: CloseIcon,
  LAPSED: AlertIcon,
} as const;

const TONES = {
  APPROVED: 'text-positive',
  REJECTED: 'text-ink-muted',
  LAPSED: 'text-warning',
} as const;

type Props = {
  entry: Settled;
  onExpire: (key: string, hadFocus: boolean) => void;
};

/** A decided graphic stays visible briefly so the producer sees what happened. */
export function SettledCard({ entry, onExpire }: Props) {
  const ref = useRef<HTMLLIElement>(null);
  const Icon = ICONS[entry.outcome];
  useEffect(() => {
    if (document.activeElement === document.body) {
      ref.current?.focus({ preventScroll: true });
    }
    const timer = setTimeout(
      () =>
        onExpire(
          entry.key,
          ref.current?.contains(document.activeElement) ?? false,
        ),
      SETTLED_VISIBLE_MS,
    );
    return () => clearTimeout(timer);
  }, [entry.key, onExpire]);
  return (
    <li
      ref={ref}
      tabIndex={-1}
      data-testid="settled-review"
      className="flex items-start gap-2 rounded-lg border border-line bg-surface-sunken p-3 outline-none"
    >
      <Icon size={16} className={cn('mt-0.5', TONES[entry.outcome])} />
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-ink">{entry.text}</p>
        <p className="truncate text-micro text-ink-subtle">
          {entry.headline}
          {entry.outcome === 'LAPSED' ? ` · ${SETTLED_COPY.lapsedDetail}` : ''}
        </p>
      </div>
    </li>
  );
}

'use client';

import { useEffect, useRef } from 'react';
import { CloseIcon } from '@/components/icons';
import { Button } from '@/components/ui';
import { TOUR_ACTIVE_ATTRIBUTE, TOUR_COPY } from '@/constants/guide';
import { findTarget, type ResolvedStep } from './resolve-steps';

type TourPanelProps = {
  steps: readonly ResolvedStep[];
  index: number;
  onIndex: (index: number) => void;
  onClose: () => void;
};

/** Marks the region being described and scrolls it into view without moving focus. */
function useActiveTarget(selector: string | undefined) {
  useEffect(() => {
    const el = selector ? findTarget(selector) : null;
    el?.setAttribute(TOUR_ACTIVE_ATTRIBUTE, '');
    el?.scrollIntoView?.({ block: 'center', behavior: 'auto' });
    return () => el?.removeAttribute(TOUR_ACTIVE_ATTRIBUTE);
  }, [selector]);
}

/** Non-modal: the replay and the rest of the page stay usable. */
export function TourPanel({ steps, index, onIndex, onClose }: TourPanelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const current = steps[index];
  const last = index === steps.length - 1;
  useActiveTarget(current?.selector);
  useEffect(() => ref.current?.focus(), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={TOUR_COPY.panelLabel}
      tabIndex={-1}
      className="fixed inset-x-4 bottom-4 z-50 rounded-lg border border-line-strong bg-surface p-4 shadow-float outline-none sm:left-auto sm:right-4 sm:w-96"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {current ? (
            <p className="eyebrow text-accent">
              {TOUR_COPY.step(index + 1, steps.length)}
            </p>
          ) : null}
          <h2 className="mt-1 text-sm font-semibold text-ink">
            {current?.step.title ?? TOUR_COPY.panelLabel}
          </h2>
        </div>
        <Button
          variant="ghost"
          iconOnly
          aria-label={TOUR_COPY.close}
          onClick={onClose}
          leadingIcon={<CloseIcon size={16} />}
        />
      </div>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
        {current?.step.body ?? TOUR_COPY.empty}
      </p>
      {current ? (
        <div className="mt-4 flex justify-between gap-2">
          <Button
            variant="ghost"
            disabled={index === 0}
            onClick={() => onIndex(index - 1)}
          >
            {TOUR_COPY.back}
          </Button>
          <Button
            variant="primary"
            onClick={last ? onClose : () => onIndex(index + 1)}
          >
            {last ? TOUR_COPY.done : TOUR_COPY.next}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

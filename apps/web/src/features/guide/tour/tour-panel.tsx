'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon } from '@/components/icons';
import { Button } from '@/components/ui';
import { TOUR_ACTIVE_ATTRIBUTE, TOUR_COPY } from '@/constants/guide';
import { PANEL_MARGIN, placePanel } from './place-panel';
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

const WIDTH = 384;
const ANCHOR = '[data-tour-trigger]';

/**
 * Portalled to the body: the sticky header's backdrop blur would otherwise
 * become the containing block of `position: fixed` and clip the panel.
 */
function usePlacement(
  ref: React.RefObject<HTMLDivElement | null>,
  key: number,
) {
  const [style, setStyle] = useState<React.CSSProperties>({
    visibility: 'hidden',
  });
  useLayoutEffect(() => {
    const place = () => {
      const el = ref.current;
      if (!el) return;
      const viewport = { width: window.innerWidth, height: window.innerHeight };
      const width = Math.min(WIDTH, viewport.width - 2 * PANEL_MARGIN);
      el.style.width = `${width}px`;
      const anchor =
        document.querySelector(ANCHOR)?.getBoundingClientRect() ??
        ({ top: 0, bottom: 0, left: 0, right: viewport.width } as const);
      const { top, left } = placePanel(
        anchor,
        { width, height: el.offsetHeight },
        viewport,
      );
      setStyle({
        top,
        left,
        width,
        maxHeight: viewport.height - 2 * PANEL_MARGIN,
      });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [ref, key]);
  return style;
}

/** Non-modal: the replay and the rest of the page stay usable. */
export function TourPanel({ steps, index, onIndex, onClose }: TourPanelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const current = steps[index];
  const last = index === steps.length - 1;
  const style = usePlacement(ref, index);
  useActiveTarget(current?.selector);
  useEffect(() => ref.current?.focus(), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div
      ref={ref}
      style={style}
      role="dialog"
      aria-label={TOUR_COPY.panelLabel}
      tabIndex={-1}
      className="fixed z-50 overflow-y-auto rounded-lg border border-line-strong bg-surface p-4 shadow-float outline-none"
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
    </div>,
    document.body,
  );
}

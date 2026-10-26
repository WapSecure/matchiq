'use client';

import { useCallback, useEffect, useState } from 'react';
import { CompassIcon } from '@/components/icons';
import { Button } from '@/components/ui';
import { TOUR_COPY } from '@/constants/guide';
import { type ResolvedStep, resolveSteps } from './resolve-steps';
import { readTourDismissed, writeTourDismissed } from './tour-storage';
import { TourPanel } from './tour-panel';

const TRIGGER_ATTRIBUTE = 'data-tour-trigger';

/** Opt-in only: it never opens by itself and never touches the replay. */
export function TourLauncher() {
  const [steps, setSteps] = useState<ResolvedStep[] | null>(null);
  const [index, setIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => setDismissed(readTourDismissed()), []);

  const open = () => {
    setSteps(resolveSteps());
    setIndex(0);
  };
  const close = useCallback(() => {
    setSteps(null);
    setDismissed(true);
    writeTourDismissed();
    document.querySelector<HTMLElement>(`[${TRIGGER_ATTRIBUTE}]`)?.focus();
  }, []);

  return (
    <>
      <Button
        {...{ [TRIGGER_ATTRIBUTE]: '' }}
        variant="ghost"
        size="sm"
        aria-expanded={steps !== null}
        onClick={open}
        leadingIcon={<CompassIcon size={14} />}
      >
        <span className={dismissed ? 'sr-only' : 'sr-only sm:not-sr-only'}>
          {dismissed ? TOUR_COPY.again : TOUR_COPY.start}
        </span>
      </Button>
      {steps ? (
        <TourPanel
          steps={steps}
          index={index}
          onIndex={setIndex}
          onClose={close}
        />
      ) : null}
    </>
  );
}

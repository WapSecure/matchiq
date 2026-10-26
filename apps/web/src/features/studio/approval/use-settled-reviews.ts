'use client';

import type { OverlayReview } from '@matchiq/contracts';
import { useCallback, useMemo, useState } from 'react';
import {
  SETTLED_COPY,
  type SettledOutcome,
} from '@/constants/approval-shortcuts';
import { DEFAULT_COMMENTARY_LOCALE } from '@/constants/match';
import { useThrottledAnnouncement } from '../hooks/use-announcer';

export type Settled = {
  key: string;
  headline: string;
  outcome: SettledOutcome;
  text: string;
};

export const reviewKey = (review: OverlayReview) =>
  `${review.overlayId}:${review.revision}`;

const clockText = (offsetMs: number) =>
  new Date(Date.now() + offsetMs).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

const textFor = (outcome: SettledOutcome, offsetMs: number) =>
  outcome === 'LAPSED'
    ? SETTLED_COPY.LAPSED
    : SETTLED_COPY[outcome](clockText(offsetMs));

/**
 * Keeps each decided or lapsed graphic on screen for a moment, with a plain
 * confirmation that is announced once, politely.
 */
export const useSettledReviews = (offsetMs: number) => {
  const [settled, setSettled] = useState<Record<string, Settled>>({});
  const [message, setMessage] = useState<{
    text: string;
    locale: typeof DEFAULT_COMMENTARY_LOCALE;
  } | null>(null);

  const settle = useCallback(
    (review: OverlayReview, outcome: SettledOutcome) => {
      const key = reviewKey(review);
      const text = textFor(outcome, offsetMs);
      const { headline } = review.cue;
      setSettled((all) =>
        all[key] ? all : { ...all, [key]: { key, headline, outcome, text } },
      );
      setMessage({
        text: `${text}: ${headline}`,
        locale: DEFAULT_COMMENTARY_LOCALE,
      });
    },
    [offsetMs],
  );

  const forget = useCallback(
    (key: string) => setSettled(({ [key]: _gone, ...rest }) => rest),
    [],
  );

  const spoken = useThrottledAnnouncement(message);
  return useMemo(
    () => ({ settled, settle, forget, spoken }),
    [settled, settle, forget, spoken],
  );
};

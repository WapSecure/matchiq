'use client';

import { INSIGHT_KIND_LABELS } from '@/constants/match';
import { useThrottledAnnouncement } from '../hooks/use-announcer';
import { selectNarrative, useMatchStore, useStudioUi } from '../store';

/** Announces only P0/P1 key moments, throttled (spec §47). */
export function LiveAnnouncer() {
  const persona = useStudioUi((s) => s.persona);
  const locale = useStudioUi((s) => s.locale);
  const message = useMatchStore((s) => {
    const top = s.insights.find((i) => i.priority !== 'P2');
    if (!top) return null;
    const view = selectNarrative(s, top.insightId, persona, locale);
    return view?.narrative.headline ?? INSIGHT_KIND_LABELS[top.kind];
  });
  const spoken = useThrottledAnnouncement(message);
  return (
    <p aria-live="polite" aria-atomic="true" className="sr-only">
      {spoken}
    </p>
  );
}

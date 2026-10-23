'use client';

import {
  DEFAULT_COMMENTARY_LOCALE,
  INSIGHT_KIND_LABELS,
} from '@/constants/match';
import { narrativeLanguage } from '@/lib/narrative-language';
import { useThrottledAnnouncement } from '../hooks/use-announcer';
import { selectNarrative, useMatchStoreShallow, useStudioUi } from '../store';

/** Announces only P0/P1 key moments, throttled (spec §47). */
export function LiveAnnouncer() {
  const persona = useStudioUi((s) => s.persona);
  const locale = useStudioUi((s) => s.locale);
  const message = useMatchStoreShallow((s) => {
    const top = s.insights.find((i) => i.priority !== 'P2');
    if (!top) return null;
    const view = selectNarrative(s, top.insightId, persona, locale);
    return {
      text: view?.narrative.headline ?? INSIGHT_KIND_LABELS[top.kind],
      locale: view
        ? narrativeLanguage(view.narrative)
        : DEFAULT_COMMENTARY_LOCALE,
    };
  });
  const spoken = useThrottledAnnouncement(message);
  return (
    <p
      aria-live="polite"
      aria-atomic="true"
      lang={spoken?.locale ?? DEFAULT_COMMENTARY_LOCALE}
      className="sr-only"
    >
      {spoken?.text}
    </p>
  );
}

'use client';

import type { Narrative } from '@matchiq/contracts';
import { narrativeLanguage } from '@/lib/narrative-language';
import { ListenButton } from './listen-button';
import { narrativeTranscript } from './transcript';

/** Listen control for one published narrative, in the language it is shown. */
export function NarrativeListen({ narrative }: { narrative: Narrative }) {
  return (
    <ListenButton
      locale={narrativeLanguage(narrative)}
      text={narrativeTranscript(narrative)}
      headline={narrative.headline}
    />
  );
}

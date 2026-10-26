'use client';

import type { OverlayCue } from '@matchiq/contracts';
import { useMemo } from 'react';
import { selectInsight, useMatchStore, useStudioUi } from '../studio/store';
import { checkFigures } from './check-figures';
import { NumbersChecked } from './numbers-checked';

const WITHHELD: ReadonlySet<OverlayCue['status']> = new Set([
  'RETRACTED',
  'FAILED',
]);

/** Receipt for the graphic on air: its figures against the moment's stats. */
export function CueNumbersChecked({ cue }: { cue: OverlayCue }) {
  const persona = useStudioUi((s) => s.persona);
  const openEvidence = useStudioUi((s) => s.openEvidence);
  const { insightId } = cue;
  const insight = useMatchStore((s) => selectInsight(s, insightId ?? null));
  const ruledOut = useMatchStore((s) =>
    s.retractions.some((r) => r.overlayId === cue.overlayId),
  );
  const figures = useMemo(
    () =>
      insight && !ruledOut && !WITHHELD.has(cue.status)
        ? checkFigures(insight, {
            texts: [cue.headline, cue.body],
            locale: cue.locale,
          })
        : null,
    [insight, ruledOut, cue],
  );
  return (
    <NumbersChecked
      figures={figures}
      persona={persona}
      headline={cue.headline}
      onOpen={insightId ? () => openEvidence(insightId) : undefined}
    />
  );
}

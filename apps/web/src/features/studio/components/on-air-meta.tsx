import type { Locale } from '@matchiq/contracts';
import { Badge, HintBadge } from '@/components/ui';
import { CUE_HOLD_MS, OVERLAY_COPY } from '@/constants/overlay';
import { OVERLAY_KIND_LABELS } from '@/constants/match';
import type { OnAir } from '../lib/cue-dwell';
import { useStudioUi } from '../store';

const MS_PER_SECOND = 1_000;
const FIRST_REVISION = 1;

/** Kind, copy source and hold state of the cue on air. */
export function OnAirMeta({ onAir, locale }: { onAir: OnAir; locale: Locale }) {
  const dwellMs = CUE_HOLD_MS[useStudioUi((s) => s.cueHold)];
  const { cue } = onAir;
  if (!cue) return null;
  const source = cue.revision > FIRST_REVISION ? 'AGENT' : 'TEMPLATE';
  return (
    <div
      data-testid="on-air-meta"
      className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5"
    >
      <Badge tone="accent" dot>
        {OVERLAY_KIND_LABELS[cue.kind]}
      </Badge>
      <HintBadge hint={OVERLAY_COPY.sourceHint}>
        {OVERLAY_COPY.source[source]}
      </HintBadge>
      {cue.locale !== locale ? (
        <Badge>{OVERLAY_COPY.localeFallback}</Badge>
      ) : null}
      {onAir.held ? (
        <HintBadge
          className="ml-auto"
          hint={OVERLAY_COPY.heldHint(dwellMs / MS_PER_SECOND)}
        >
          {OVERLAY_COPY.held}
        </HintBadge>
      ) : null}
    </div>
  );
}

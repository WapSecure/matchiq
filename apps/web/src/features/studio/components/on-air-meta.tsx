import type { Locale } from '@matchiq/contracts';
import { Badge } from '@/components/ui';
import { CUE_MIN_DWELL_MS, OVERLAY_COPY } from '@/constants/overlay';
import { OVERLAY_KIND_LABELS } from '@/constants/match';
import type { OnAir } from '../lib/cue-dwell';

const MS_PER_SECOND = 1_000;
const FIRST_REVISION = 1;

/** Kind, priority, copy source and hold state of the cue on air. */
export function OnAirMeta({ onAir, locale }: { onAir: OnAir; locale: Locale }) {
  const { cue } = onAir;
  if (!cue) return null;
  const source = cue.revision > FIRST_REVISION ? 'AGENT' : 'TEMPLATE';
  return (
    <div
      data-testid="on-air-meta"
      className="mb-2 flex flex-wrap items-center gap-1.5"
    >
      <Badge tone="accent" dot>
        {OVERLAY_KIND_LABELS[cue.kind]}
      </Badge>
      <Badge>{OVERLAY_COPY.priority(cue.priority)}</Badge>
      <Badge title={OVERLAY_COPY.sourceHint}>
        {OVERLAY_COPY.source[source]}
      </Badge>
      {cue.locale !== locale ? (
        <Badge>{OVERLAY_COPY.localeFallback}</Badge>
      ) : null}
      {onAir.held ? (
        <Badge
          className="ml-auto"
          title={OVERLAY_COPY.heldHint(CUE_MIN_DWELL_MS / MS_PER_SECOND)}
        >
          {OVERLAY_COPY.held}
        </Badge>
      ) : null}
    </div>
  );
}

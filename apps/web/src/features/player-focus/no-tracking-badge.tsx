import { InfoIcon } from '@/components/icons';
import { PLAYER_FOCUS_COPY as C } from '@/constants/player-focus';

/** Spec §27/§31.6: no speed, distance or position is shown without tracking. */
export function NoTrackingBadge() {
  return (
    <p
      data-testid="no-tracking-badge"
      className="inline-flex items-center gap-1.5 self-start rounded-[5px] border border-line-strong bg-surface-raised px-2 py-1 text-micro font-medium text-ink-muted"
    >
      <InfoIcon size={12} className="shrink-0" />
      {C.noTracking}
    </p>
  );
}

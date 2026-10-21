import type { OverlayCue as OverlayCueData } from '@matchiq/contracts';
import { OVERLAY_KIND_LABELS } from '@/constants/match';

/** Lower-third graphic; type is sized in container units to track a 1080p frame. */
export function OverlayCue({ cue }: { cue: OverlayCueData }) {
  return (
    <article
      data-overlay-id={cue.overlayId}
      className="flex max-w-full @lg:max-w-[62cqw] overflow-hidden rounded-[0.4cqw] bg-canvas/90 shadow-lg ring-1 ring-line-strong motion-safe:animate-[cue-in_240ms_ease-out]"
    >
      <span aria-hidden className="w-[0.5cqw] shrink-0 bg-accent" />
      <div className="min-w-0 px-[1.6cqw] py-[1.1cqw]">
        <p className="text-[max(9px,1.25cqw)] font-semibold uppercase tracking-[0.08em] text-accent-strong">
          {OVERLAY_KIND_LABELS[cue.kind]}
        </p>
        <p className="mt-[0.3cqw] line-clamp-1 text-[max(13px,2.3cqw)] font-semibold leading-tight text-ink">
          {cue.headline}
        </p>
        {cue.body ? (
          <p className="mt-[0.3cqw] line-clamp-2 text-[max(11px,1.55cqw)] leading-snug text-ink-muted">
            {cue.body}
          </p>
        ) : null}
      </div>
    </article>
  );
}

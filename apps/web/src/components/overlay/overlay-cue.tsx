import type { OverlayCue as OverlayCueData } from '@matchiq/contracts';
import { LogoMark } from '@/components/icons';
import { OVERLAY_KIND_LABELS } from '@/constants/match';
import { CUE_KIND_TONE, type CueTone } from '@/constants/overlay';
import { cn } from '@/lib/cn';

const TAB: Record<CueTone, string> = {
  accent: 'bg-accent text-accent-ink',
  score: 'bg-ink text-canvas',
  discipline: 'bg-card-yellow text-canvas',
};

const RULE: Record<CueTone, string> = {
  accent: 'bg-accent',
  score: 'bg-ink',
  discipline: 'bg-card-yellow',
};

/**
 * Lower-third graphic. Type is sized in container units to track a 1080p
 * frame; the slab wipes in and the copy settles, unless motion is reduced.
 */
export function OverlayCue({ cue }: { cue: OverlayCueData }) {
  const tone = CUE_KIND_TONE[cue.kind];
  return (
    <article
      data-overlay-id={cue.overlayId}
      className="flex max-w-full flex-col items-start @lg:max-w-[66cqw] motion-safe:animate-[cue-wipe_480ms_var(--ease-broadcast)_both]"
    >
      <p
        className={cn(
          'rounded-t-[0.35cqw] px-[1.2cqw] py-[0.4cqw] text-[max(9px,1.2cqw)] font-semibold uppercase leading-none tracking-[0.1em]',
          TAB[tone],
        )}
      >
        {OVERLAY_KIND_LABELS[cue.kind]}
      </p>
      <div className="flex max-w-full items-stretch overflow-hidden rounded-[0.4cqw] rounded-tl-none bg-surface-sunken/92 shadow-float ring-1 ring-white/10 backdrop-blur-sm">
        <span aria-hidden className={cn('w-[0.5cqw] shrink-0', RULE[tone])} />
        <div
          lang={cue.locale}
          className="min-w-0 px-[1.7cqw] py-[1.1cqw] motion-safe:animate-[cue-copy_420ms_var(--ease-broadcast)_160ms_both]"
        >
          <p className="line-clamp-1 text-[max(13px,2.5cqw)] font-semibold leading-tight tracking-tight text-ink">
            {cue.headline}
          </p>
          {cue.body ? (
            <p className="mt-[0.4cqw] line-clamp-2 text-[max(11px,1.6cqw)] leading-snug text-ink-muted">
              {cue.body}
            </p>
          ) : null}
        </div>
        <span
          aria-hidden
          className="flex shrink-0 items-center border-l border-white/10 bg-white/[0.03] px-[1.2cqw] text-accent"
        >
          <LogoMark className="size-[max(14px,2.4cqw)]" />
        </span>
      </div>
    </article>
  );
}

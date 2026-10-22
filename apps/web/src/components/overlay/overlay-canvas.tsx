import type {
  OverlayCue as OverlayCueData,
  SafeArea,
} from '@matchiq/contracts';
import { PitchBackdrop } from '@/components/charts/pitch-backdrop';
import { cn } from '@/lib/cn';
import { OverlayCue } from './overlay-cue';
import { type Scorebug, OverlayScorebug } from './overlay-scorebug';
import { OverlayStandby } from './overlay-standby';

export type { Scorebug } from './overlay-scorebug';

type OverlayCanvasProps = {
  cues: readonly OverlayCueData[];
  scorebug: Scorebug | null;
  watermark: string;
  standbyLabel: string;
  standbyHeld?: boolean;
  /** Headline of the most recent cue that left air, shown while standing by. */
  lastAired?: string | null;
  safeAreaLabel: string;
  frameLabel: string;
  className?: string;
};

/** EBU R95-style action-safe default when no cue specifies its own. */
export const DEFAULT_SAFE_AREA: SafeArea = {
  topPct: 5,
  rightPct: 5,
  bottomPct: 5,
  leftPct: 5,
};

const insetStyle = (area: SafeArea) => ({
  top: `${area.topPct}%`,
  right: `${area.rightPct}%`,
  bottom: `${area.bottomPct}%`,
  left: `${area.leftPct}%`,
});

/**
 * 16:9 program preview. `scheme-dark` pins every token inside to the dark set,
 * because it stands in for on-air video in both the light and dark themes.
 */
export function OverlayCanvas({
  cues,
  scorebug,
  watermark,
  standbyLabel,
  standbyHeld = false,
  lastAired = null,
  safeAreaLabel,
  frameLabel,
  className,
}: OverlayCanvasProps) {
  const area = cues[0]?.safeArea ?? DEFAULT_SAFE_AREA;
  return (
    <div className={cn('@container scheme-dark text-ink', className)}>
      <div
        role="group"
        aria-label={frameLabel}
        className="relative aspect-video w-full overflow-hidden rounded-md bg-canvas ring-1 ring-black/40"
      >
        <PitchBackdrop />
        <div data-safe-area="" className="absolute" style={insetStyle(area)}>
          <div
            aria-hidden
            className="absolute inset-0 rounded-[0.3cqw] border border-dashed border-white/15"
          />
          <span
            aria-hidden
            className="absolute -top-[1.9cqw] left-0 font-mono text-[max(8px,1cqw)] uppercase tracking-[0.12em] text-ink-subtle"
          >
            {safeAreaLabel}
          </span>
          <div className="absolute left-[1.2cqw] top-[1.2cqw]">
            {scorebug ? <OverlayScorebug bug={scorebug} /> : null}
          </div>
          <span className="absolute right-[1.2cqw] top-[1.2cqw] rounded-[0.3cqw] border border-synthetic/40 bg-surface-sunken/80 px-[0.8cqw] py-[0.35cqw] text-[max(9px,1.15cqw)] font-semibold uppercase tracking-[0.1em] text-synthetic backdrop-blur-sm">
            {watermark}
          </span>
          <div className="absolute bottom-[1.4cqw] left-[1.4cqw] right-[1.4cqw] flex flex-col items-start gap-[0.8cqw]">
            {cues.length === 0 ? (
              <OverlayStandby
                label={standbyLabel}
                held={standbyHeld}
                lastAired={lastAired}
              />
            ) : (
              cues.map((cue) => (
                <OverlayCue
                  key={`${cue.overlayId}:${cue.revision}`}
                  cue={cue}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

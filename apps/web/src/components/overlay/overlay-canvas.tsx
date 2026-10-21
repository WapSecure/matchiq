import type {
  OverlayCue as OverlayCueData,
  SafeArea,
} from '@matchiq/contracts';
import { OverlayCue } from './overlay-cue';
import { OverlayStandby } from './overlay-standby';

export type Scorebug = {
  home: string;
  away: string;
  score: string;
  clock: string;
};

type OverlayCanvasProps = {
  cues: readonly OverlayCueData[];
  scorebug: Scorebug | null;
  watermark: string;
  standbyLabel: string;
  /** Headline of the most recent cue that left air, shown while standing by. */
  lastAired?: string | null;
  safeAreaLabel: string;
  frameLabel: string;
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

function PitchMarkings() {
  return (
    <div aria-hidden className="absolute inset-0 opacity-60">
      <div className="absolute inset-y-[8%] left-1/2 w-px bg-line" />
      <div className="absolute left-1/2 top-1/2 size-[16cqw] -translate-x-1/2 -translate-y-1/2 rounded-full border border-line" />
      <div className="absolute inset-[8%] rounded-[0.4cqw] border border-line" />
    </div>
  );
}

function ScorebugGraphic({ bug }: { bug: Scorebug }) {
  return (
    <div className="flex items-stretch overflow-hidden rounded-[0.4cqw] bg-canvas/90 text-[max(11px,1.6cqw)] font-semibold text-ink ring-1 ring-line-strong">
      <span className="px-[1cqw] py-[0.5cqw]">{bug.home}</span>
      <span className="tabular bg-surface-raised px-[1cqw] py-[0.5cqw]">
        {bug.score}
      </span>
      <span className="px-[1cqw] py-[0.5cqw]">{bug.away}</span>
      <span className="tabular border-l border-line-strong px-[1cqw] py-[0.5cqw] font-mono text-ink-muted">
        {bug.clock}
      </span>
    </div>
  );
}

export function OverlayCanvas({
  cues,
  scorebug,
  watermark,
  standbyLabel,
  lastAired = null,
  safeAreaLabel,
  frameLabel,
}: OverlayCanvasProps) {
  const area = cues[0]?.safeArea ?? DEFAULT_SAFE_AREA;
  return (
    <div className="@container">
      <div
        role="group"
        aria-label={frameLabel}
        className="relative aspect-video w-full overflow-hidden rounded-md bg-surface-sunken ring-1 ring-line"
      >
        <PitchMarkings />
        <div data-safe-area="" className="absolute" style={insetStyle(area)}>
          <div
            aria-hidden
            className="absolute inset-0 rounded-[0.3cqw] border border-dashed border-line-strong"
          />
          <span
            aria-hidden
            className="absolute -top-[1.8cqw] left-0 text-[max(9px,1.1cqw)] uppercase tracking-[0.08em] text-ink-subtle"
          >
            {safeAreaLabel}
          </span>
          <div className="absolute left-[1cqw] top-[1cqw]">
            {scorebug ? <ScorebugGraphic bug={scorebug} /> : null}
          </div>
          <span className="absolute right-[1cqw] top-[1cqw] rounded-[0.3cqw] border border-synthetic/40 bg-synthetic-soft px-[0.8cqw] py-[0.3cqw] text-[max(9px,1.15cqw)] font-semibold uppercase tracking-[0.1em] text-synthetic">
            {watermark}
          </span>
          <div className="absolute bottom-[1cqw] left-[1cqw] right-[1cqw] flex flex-col items-start gap-[0.8cqw]">
            {cues.length === 0 ? (
              <OverlayStandby label={standbyLabel} lastAired={lastAired} />
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

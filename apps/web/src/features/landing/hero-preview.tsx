import { PitchPlot } from '@/components/charts/pitch-plot';
import { EvidenceIcon, SparkIcon } from '@/components/icons';
import { Scoreboard } from '@/components/match/scoreboard';
import { TeamSwatch } from '@/components/match/team-swatch';
import { OverlayCanvas } from '@/components/overlay/overlay-canvas';
import { Badge } from '@/components/ui';
import { DEMO, DEMO_CUE, DEMO_MARKS } from '@/constants/landing-demo';
import { DEFAULT_PITCH } from '@/constants/pitch';
import { STUDIO_COPY, WATERMARK } from '@/constants/studio';

function PreviewInsight() {
  const i = DEMO.insight;
  return (
    <div className="flex flex-col gap-2 rounded-md border border-line bg-surface p-3 shadow-[inset_3px_0_0_var(--mq-accent)]">
      <div className="flex items-center gap-2">
        <Badge tone="accent">{i.priority}</Badge>
        <span className="text-xs font-medium text-ink">{i.kind}</span>
        <span className="inline-flex items-center gap-1 font-mono text-micro font-semibold text-ink-muted">
          <TeamSwatch side="home" className="size-2" />
          {DEMO.home.shortName}
        </span>
      </div>
      <p className="text-sm font-semibold leading-snug text-ink">
        {i.headline}
      </p>
      <p className="line-clamp-2 text-xs leading-relaxed text-ink-muted">
        {i.body}
      </p>
      <p className="mt-auto flex items-center gap-1.5 text-micro text-ink-subtle">
        <EvidenceIcon size={12} />
        {i.evidence}
      </p>
    </div>
  );
}

/**
 * Product shot built from the studio's own components and synthetic sample
 * data. Exposed to assistive tech as one image with a text description.
 */
export function HeroPreview() {
  return (
    <div role="img" aria-label={DEMO.label} className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-6 rounded-[28px] bg-[radial-gradient(60%_60%_at_60%_40%,var(--mq-accent-soft),transparent_70%)]"
      />
      <div
        aria-hidden
        className="relative overflow-hidden rounded-xl border border-line-strong bg-canvas shadow-float"
      >
        <div className="flex h-9 items-center gap-2 border-b border-line bg-surface px-3">
          <SparkIcon size={13} className="text-accent" />
          <span className="min-w-0 truncate text-micro font-medium text-ink-muted">
            {DEMO.chrome} · {DEMO.title}
          </span>
          <Badge tone="synthetic" className="ml-auto hidden sm:inline-flex">
            {WATERMARK}
          </Badge>
          <Badge tone="positive" dot className="ml-auto sm:ml-0">
            {DEMO.live}
          </Badge>
        </div>
        <div className="flex flex-col gap-3 p-3">
          <div className="rounded-md border border-line bg-surface px-2 py-3">
            <Scoreboard
              label={STUDIO_COPY.scoreboardLabel}
              home={DEMO.home}
              away={DEMO.away}
              score={DEMO.score}
              period={DEMO.period}
              clockMs={DEMO.clockMs}
              phase="IN_PLAY"
            />
          </div>
          <OverlayCanvas
            cues={[DEMO_CUE]}
            scorebug={{
              home: DEMO.home.shortName,
              away: DEMO.away.shortName,
              homeScore: DEMO.score.home,
              awayScore: DEMO.score.away,
              clock: DEMO.clock,
            }}
            watermark={WATERMARK}
            standbyLabel=""
            safeAreaLabel={STUDIO_COPY.overlay.safeArea}
            frameLabel={STUDIO_COPY.overlay.frameLabel(1)}
          />
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
            <div className="rounded-md border border-line bg-surface p-2">
              <PitchPlot
                marks={DEMO_MARKS}
                length={DEFAULT_PITCH.lengthM}
                width={DEFAULT_PITCH.widthM}
                title=""
                description=""
              />
            </div>
            <PreviewInsight />
          </div>
        </div>
      </div>
    </div>
  );
}

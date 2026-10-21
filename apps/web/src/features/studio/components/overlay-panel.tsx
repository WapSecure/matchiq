'use client';

import type { ReactNode } from 'react';
import { BroadcastIcon } from '@/components/icons';
import {
  OverlayCanvas,
  type Scorebug,
} from '@/components/overlay/overlay-canvas';
import { Panel } from '@/components/ui';
import { STUDIO_COPY, WATERMARK } from '@/constants/studio';
import { formatClock } from '@/lib/format';
import {
  selectActiveCues,
  useMatchStore,
  useMatchStoreShallow,
  useStudioUi,
} from '../store';

type OverlayPanelProps = {
  homeShort: string;
  awayShort: string;
  className?: string;
  footer?: ReactNode;
};

function RetractionLog() {
  const retractions = useMatchStore((s) => s.retractions);
  if (retractions.length === 0) return null;
  return (
    <div className="mt-3">
      <h3 className="eyebrow mb-1.5">{STUDIO_COPY.overlay.cueLog}</h3>
      <ul className="flex flex-col gap-1 text-xs">
        {retractions.map((r) => (
          <li
            key={r.overlayId}
            className="flex flex-wrap items-baseline gap-x-2 text-ink-muted"
          >
            <span className="eyebrow text-warning">
              {STUDIO_COPY.overlay.retracted}
            </span>
            <span className="text-ink">{r.headline ?? r.overlayId}</span>
            <span className="text-ink-subtle">{r.reason}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function OverlayPanel({
  homeShort,
  awayShort,
  className,
  footer,
}: OverlayPanelProps) {
  const persona = useStudioUi((s) => s.persona);
  const locale = useStudioUi((s) => s.locale);
  const cues = useMatchStoreShallow((s) =>
    selectActiveCues(s, persona, locale),
  );
  const score = useMatchStore((s) => s.snapshot?.score ?? null);
  const clock = useMatchStore((s) => formatClock(s.clock.period, s.clock.ms));
  const scorebug: Scorebug | null = score
    ? {
        home: homeShort,
        away: awayShort,
        score: `${score.home}–${score.away}`,
        clock,
      }
    : null;
  const copy = STUDIO_COPY.overlay;
  return (
    <Panel
      id="overlay"
      title={copy.title}
      description={copy.description}
      Icon={BroadcastIcon}
      className={className}
    >
      <OverlayCanvas
        cues={cues}
        scorebug={scorebug}
        watermark={WATERMARK}
        emptyLabel={copy.empty}
        safeAreaLabel={copy.safeArea}
        frameLabel={copy.frameLabel(cues.length)}
      />
      {footer}
      <RetractionLog />
    </Panel>
  );
}

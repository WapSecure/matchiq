'use client';

import type { ReactNode } from 'react';
import { BroadcastIcon } from '@/components/icons';
import {
  OverlayCanvas,
  type Scorebug,
} from '@/components/overlay/overlay-canvas';
import { Panel, SegmentedControl } from '@/components/ui';
import { OVERLAY_COPY } from '@/constants/overlay';
import { STUDIO_COPY, WATERMARK } from '@/constants/studio';
import { formatClock } from '@/lib/format';
import { useOnAirCue } from '../hooks/use-on-air-cue';
import { useMatchStore, useStudioUi } from '../store';
import { CueLog } from './cue-log';
import { OnAirMeta } from './on-air-meta';

type OverlayPanelProps = {
  homeShort: string;
  awayShort: string;
  className?: string;
  footer?: ReactNode;
};

export function OverlayPanel({
  homeShort,
  awayShort,
  className,
  footer,
}: OverlayPanelProps) {
  const persona = useStudioUi((s) => s.persona);
  const locale = useStudioUi((s) => s.locale);
  const cueHold = useStudioUi((s) => s.cueHold);
  const setCueHold = useStudioUi((s) => s.setCueHold);
  const lastHeadline = useMatchStore((s) => s.retractions[0]?.headline ?? null);
  const onAir = useOnAirCue(persona, locale);
  const cues = onAir.cue ? [onAir.cue] : [];
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
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <OnAirMeta onAir={onAir} locale={locale} />
        <SegmentedControl
          className="ml-auto"
          legend={OVERLAY_COPY.holdLegend}
          options={OVERLAY_COPY.holdOptions}
          value={cueHold}
          onChange={setCueHold}
        />
      </div>
      <OverlayCanvas
        cues={cues}
        scorebug={scorebug}
        watermark={WATERMARK}
        standbyLabel={OVERLAY_COPY.standby}
        lastAired={lastHeadline ? OVERLAY_COPY.lastAired(lastHeadline) : null}
        safeAreaLabel={copy.safeArea}
        frameLabel={copy.frameLabel(cues.length)}
      />
      {footer}
      <CueLog />
    </Panel>
  );
}

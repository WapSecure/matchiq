'use client';

import type { ReactNode } from 'react';
import { BroadcastIcon } from '@/components/icons';
import {
  OverlayCanvas,
  type Scorebug,
} from '@/components/overlay/overlay-canvas';
import { Badge, Panel, SegmentedControl } from '@/components/ui';
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

function useScorebug(home: string, away: string): Scorebug | null {
  const score = useMatchStore((s) => s.snapshot?.score ?? null);
  const clock = useMatchStore((s) => formatClock(s.clock.period, s.clock.ms));
  return score
    ? { home, away, homeScore: score.home, awayScore: score.away, clock }
    : null;
}

function Tally({ onAir }: { onAir: boolean }) {
  return onAir ? (
    <Badge tone="onair" dot>
      {OVERLAY_COPY.onAir}
    </Badge>
  ) : (
    <Badge dot>{OVERLAY_COPY.standbyTally}</Badge>
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
  const cueHold = useStudioUi((s) => s.cueHold);
  const setCueHold = useStudioUi((s) => s.setCueHold);
  const lastHeadline = useMatchStore((s) => s.retractions[0]?.headline ?? null);
  const onAir = useOnAirCue(persona, locale);
  const cues = onAir.cue ? [onAir.cue] : [];
  const scorebug = useScorebug(homeShort, awayShort);
  const copy = STUDIO_COPY.overlay;
  return (
    <Panel
      id="overlay"
      title={copy.title}
      description={copy.description}
      Icon={BroadcastIcon}
      className={className}
      actions={<Tally onAir={cues.length > 0} />}
    >
      <div className="mb-3 flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
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
      <p
        className="mt-2 flex items-center gap-1.5 text-micro text-ink-subtle"
        title={OVERLAY_COPY.programNoteHint}
      >
        <BroadcastIcon size={12} className="shrink-0" />
        {OVERLAY_COPY.programNote}
        <span className="sr-only">. {OVERLAY_COPY.programNoteHint}</span>
      </p>
      {footer}
      <CueLog />
    </Panel>
  );
}

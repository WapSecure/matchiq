'use client';

import type { ReactNode } from 'react';
import { BroadcastIcon } from '@/components/icons';
import {
  OverlayCanvas,
  type Scorebug,
} from '@/components/overlay/overlay-canvas';
import type { StandbyHold } from '@/components/overlay/overlay-standby';
import { Badge, InfoTip, Panel, SegmentedControl } from '@/components/ui';
import { OVERLAY_COPY } from '@/constants/overlay';
import { STUDIO_COPY, WATERMARK } from '@/constants/studio';
import { formatClock } from '@/lib/format';
import { ApprovalQueue } from '../approval/approval-queue';
import { useEditorialMode } from '../editorial/editorial-status';
import { RetractCueButton } from '../editorial/retract-cue-button';
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

const HOLD_OF = {
  FROZEN: 'paused',
  KILLED: 'stopped',
} as const satisfies Record<'FROZEN' | 'KILLED', StandbyHold>;

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

function HoldControl() {
  const cueHold = useStudioUi((s) => s.cueHold);
  const setCueHold = useStudioUi((s) => s.setCueHold);
  return (
    <div className="flex items-center gap-2">
      <span aria-hidden className="text-micro text-ink-subtle">
        {OVERLAY_COPY.holdShort}
      </span>
      <SegmentedControl
        legend={OVERLAY_COPY.holdLegend}
        hideLegend
        options={OVERLAY_COPY.holdOptions}
        value={cueHold}
        onChange={setCueHold}
      />
    </div>
  );
}

function ProgramNote() {
  return (
    <p className="flex items-center gap-1 text-micro text-ink-subtle">
      <BroadcastIcon size={12} className="shrink-0" />
      {OVERLAY_COPY.programNote}
      <span className="sr-only">. {OVERLAY_COPY.programNoteHint}</span>
      <InfoTip content={OVERLAY_COPY.programNoteHint} />
    </p>
  );
}

/** Program preview with its tally, cue details, hold setting and transport. */
export function OverlayPanel({
  homeShort,
  awayShort,
  className,
  footer,
}: OverlayPanelProps) {
  const persona = useStudioUi((s) => s.persona);
  const locale = useStudioUi((s) => s.locale);
  const lastHeadline = useMatchStore((s) => s.retractions[0]?.headline ?? null);
  const onAir = useOnAirCue(persona, locale);
  const cues = onAir.cue ? [onAir.cue] : [];
  const scorebug = useScorebug(homeShort, awayShort);
  const mode = useEditorialMode();
  const held = mode === 'AUTO' ? null : OVERLAY_COPY.hold[mode];
  const copy = STUDIO_COPY.overlay;
  return (
    <Panel
      id="overlay"
      title={copy.title}
      description={copy.description}
      Icon={BroadcastIcon}
      className={className}
      actions={
        <>
          <RetractCueButton cue={onAir.cue} />
          <Tally onAir={cues.length > 0} />
        </>
      }
    >
      <div className="mb-2.5 flex min-h-6 flex-wrap items-center gap-1.5">
        {onAir.cue ? (
          <OnAirMeta onAir={onAir} locale={locale} />
        ) : (
          <span className="text-micro text-ink-subtle">
            {OVERLAY_COPY.nothingOnAir}
          </span>
        )}
      </div>
      <OverlayCanvas
        cues={cues}
        scorebug={scorebug}
        watermark={WATERMARK}
        standbyLabel={held?.label ?? OVERLAY_COPY.standby}
        standbyHeld={held !== null}
        standbyHold={mode === 'AUTO' ? null : HOLD_OF[mode]}
        standbyNote={held?.note ?? null}
        lastAired={lastHeadline ? OVERLAY_COPY.lastAired(lastHeadline) : null}
        safeAreaLabel={copy.safeArea}
        frameLabel={copy.frameLabel(cues.length)}
      />
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <ProgramNote />
        <HoldControl />
      </div>
      {footer}
      <ApprovalQueue />
      <CueLog />
    </Panel>
  );
}

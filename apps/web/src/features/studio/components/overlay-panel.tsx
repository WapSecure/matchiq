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
      <OnAirMeta onAir={onAir} locale={locale} />
      <OverlayCanvas
        cues={cues}
        scorebug={scorebug}
        watermark={WATERMARK}
        emptyLabel={copy.empty}
        safeAreaLabel={copy.safeArea}
        frameLabel={copy.frameLabel(cues.length)}
      />
      {footer}
      <CueLog />
    </Panel>
  );
}

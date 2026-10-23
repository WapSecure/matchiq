'use client';

import type { Fixture } from '@matchiq/contracts';
import { useMemo } from 'react';
import { UserIcon } from '@/components/icons';
import { Panel } from '@/components/ui';
import { INSIGHT_KIND_LABELS } from '@/constants/match';
import { PLAYER_FOCUS_COPY as C } from '@/constants/player-focus';
import { ViewingPreferences } from '@/features/preferences/viewing-preferences';
import {
  selectNarrative,
  useMatchStore,
  useStudioUi,
} from '@/features/studio/store';
import { type MomentSource, PlayerFocusBody } from './player-focus-body';
import { useFixtureLedger } from './use-fixture-ledger';

const useStudioMoments = (): MomentSource[] => {
  const insights = useMatchStore((s) => s.insights);
  const narratives = useMatchStore((s) => s.narratives);
  const persona = useStudioUi((s) => s.persona);
  const locale = useStudioUi((s) => s.locale);
  return useMemo(
    () =>
      insights.map((insight) => ({
        id: insight.insightId,
        headline:
          selectNarrative({ narratives }, insight.insightId, persona, locale)
            ?.narrative.headline ?? INSIGHT_KIND_LABELS[insight.kind],
        period: insight.period,
        clockMs: insight.matchClockMs,
        ...(insight.playerId ? { playerId: insight.playerId } : {}),
        eventIds: insight.evidence.eventIds,
      })),
    [insights, narratives, persona, locale],
  );
};

/** Spec §27, §31.6, E13: follow one player, counted from match events only. */
export function PlayerFocusPanel({
  fixture,
  className,
}: {
  fixture: Fixture;
  className?: string;
}) {
  const timeline = useMatchStore((s) => s.timeline);
  const ledger = useFixtureLedger(fixture.fixtureId, timeline);
  const moments = useStudioMoments();
  const openEvidence = useStudioUi((s) => s.openEvidence);
  return (
    <Panel
      id={C.id}
      title={C.title}
      description={C.description}
      Icon={UserIcon}
      className={className}
      bodyClassName="flex flex-col gap-4 p-4"
    >
      <ViewingPreferences fixture={fixture} />
      <PlayerFocusBody
        fixture={fixture}
        ledger={ledger}
        moments={moments}
        onOpenMoment={openEvidence}
      />
    </Panel>
  );
}

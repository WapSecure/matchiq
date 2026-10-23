'use client';

import type { Fixture } from '@matchiq/contracts';
import { useMemo } from 'react';
import { UserIcon } from '@/components/icons';
import { Panel } from '@/components/ui';
import { INSIGHT_KIND_LABELS } from '@/constants/match';
import { PLAYER_FOCUS_COPY as C } from '@/constants/player-focus';
import { pickNarrative } from '@/features/recap/pick-narrative';
import { useStudioUi } from '@/features/studio/store';
import type { RecapDocument } from '@/lib/api/session-schemas';
import { type MomentSource, PlayerFocusBody } from './player-focus-body';
import { useFixtureLedger } from './use-fixture-ledger';

/** The followed player's full match, counted from the final ledger. */
export function RecapPlayerFocus({
  fixture,
  recap,
}: {
  fixture: Fixture;
  recap: RecapDocument;
}) {
  const ledger = useFixtureLedger(fixture.fixtureId);
  const persona = useStudioUi((s) => s.persona);
  const locale = useStudioUi((s) => s.locale);
  const moments = useMemo<MomentSource[]>(
    () =>
      recap.keyMoments.map((m) => ({
        id: m.insightId,
        headline:
          pickNarrative(m.narratives, persona, locale)?.narrative.headline ??
          INSIGHT_KIND_LABELS[m.kind],
        period: m.period,
        clockMs: m.matchClockMs,
        ...(m.playerId ? { playerId: m.playerId } : {}),
        eventIds: m.evidenceEventIds,
      })),
    [recap.keyMoments, persona, locale],
  );
  return (
    <Panel
      id={`${C.id}-recap`}
      title={C.recapTitle}
      description={C.recapDescription}
      Icon={UserIcon}
      bodyClassName="p-4"
    >
      <PlayerFocusBody fixture={fixture} ledger={ledger} moments={moments} />
    </Panel>
  );
}

'use client';

import type { Fixture, MatchEvent, Player } from '@matchiq/contracts';
import {
  momentsInvolvingPlayer,
  playerInvolvement,
} from '@matchiq/football-engine/player';
import { useMemo } from 'react';
import { EmptyState, ErrorState } from '@/components/feedback';
import { UserIcon } from '@/components/icons';
import { Skeleton } from '@/components/ui';
import { usePageMessages } from '@/features/interface-language/use-page-messages';
import { usePreferences } from '@/features/preferences/preferences-store';
import { FollowedPlayers } from './followed-players';
import { NoTrackingBadge } from './no-tracking-badge';
import { PlayerMilestones } from './player-milestones';
import { type FocusMoment, PlayerMoments } from './player-moments';
import { PlayerPicker } from './player-picker';
import { PlayerTally } from './player-tally';
import { PlayerTimeline } from './player-timeline';
import type { LedgerStatus } from './use-fixture-ledger';
import { useFocusedPlayer } from './use-focused-player';

export type MomentSource = FocusMoment & {
  playerId?: string;
  eventIds: readonly string[];
};

export type LedgerView = {
  events: readonly MatchEvent[];
  status: LedgerStatus;
  error: unknown;
  retry: () => void;
};

type FocusContentProps = {
  player: Player;
  ledger: LedgerView;
  moments: readonly MomentSource[];
  onOpenMoment?: (id: string) => void;
};

function FocusContent({
  player,
  ledger,
  moments,
  onOpenMoment,
}: FocusContentProps) {
  const state = usePageMessages().states.playerFocus;
  const involvement = useMemo(
    () => playerInvolvement(ledger.events, player.playerId),
    [ledger.events, player.playerId],
  );
  const featured = useMemo(
    () => momentsInvolvingPlayer(moments, involvement, (m) => m.eventIds),
    [moments, involvement],
  );
  if (ledger.status === 'loading')
    return (
      <div
        role="status"
        aria-label={state.loading}
        className="flex flex-col gap-2"
      >
        <Skeleton className="h-28" />
        <Skeleton className="h-20" />
      </div>
    );
  if (ledger.status === 'error')
    return (
      <ErrorState
        title={state.loadFailed}
        error={ledger.error}
        onRetry={ledger.retry}
      />
    );
  if (involvement.actions.length === 0)
    return (
      <EmptyState
        compact
        Icon={UserIcon}
        title={state.quietTitle.replace('{player}', player.displayName)}
        description={state.quietBody}
      />
    );
  return (
    <div className="flex flex-col gap-4">
      <PlayerTally tally={involvement.tally} name={player.displayName} />
      <PlayerMilestones milestones={involvement.milestones} />
      <PlayerMoments moments={featured} onOpen={onOpenMoment} />
      <PlayerTimeline actions={involvement.actions} />
    </div>
  );
}

/** Picker, followed players and the focused player's match, with every state. */
export function PlayerFocusBody({
  fixture,
  ledger,
  moments,
  onOpenMoment,
}: Omit<FocusContentProps, 'player'> & { fixture: Fixture }) {
  const state = usePageMessages().states.playerFocus;
  const follow = usePreferences((s) => s.followPlayer);
  const { playerId, player, squad, followedHere } = useFocusedPlayer(fixture);
  return (
    <div className="flex flex-col gap-3">
      <PlayerPicker fixture={fixture} value={playerId} onChange={follow} />
      <FollowedPlayers
        squad={squad}
        followed={followedHere}
        current={playerId}
      />
      <NoTrackingBadge />
      {player ? (
        <FocusContent
          player={player}
          ledger={ledger}
          moments={moments}
          onOpenMoment={onOpenMoment}
        />
      ) : (
        <EmptyState
          compact
          Icon={UserIcon}
          title={state.pickTitle}
          description={state.pickBody}
        />
      )}
    </div>
  );
}

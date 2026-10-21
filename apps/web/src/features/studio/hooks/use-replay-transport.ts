'use client';

import type { ReplayCommand, ReplaySpeed } from '@matchiq/contracts';
import { useCallback, useEffect } from 'react';
import { useReplayCommand } from '@/lib/api/hooks';
import { useMatchStore, useMatchStoreApi, useStudioUi } from '../store';

export type TransportAction = 'start' | 'pause' | 'resume';

/** Maps UI intent to `ReplayCommand`s and folds acknowledgements into the store. */
export const useReplayTransport = (fixtureId: string) => {
  const store = useMatchStoreApi();
  const mutation = useReplayCommand(fixtureId);
  const replay = useMatchStore((s) => s.replay);
  const speed = useStudioUi((s) => s.speed);
  const setSpeedUi = useStudioUi((s) => s.setSpeed);

  const confirmedSpeed = replay?.speed;
  useEffect(() => {
    if (confirmedSpeed !== undefined) setSpeedUi(confirmedSpeed);
  }, [confirmedSpeed, setSpeedUi]);

  const send = useCallback(
    (command: ReplayCommand) =>
      mutation.mutate(command, {
        onSuccess: (ack) => {
          if (ack)
            store.getState().applyReplayStatus(ack, command.action === 'seek');
        },
      }),
    [mutation, store],
  );

  const primary: TransportAction =
    replay?.state === 'PLAYING'
      ? 'pause'
      : replay?.state === 'PAUSED'
        ? 'resume'
        : 'start';

  const runPrimary = useCallback(() => {
    if (primary === 'start') send({ action: 'start', speed });
    else send({ action: primary });
  }, [primary, send, speed]);

  const changeSpeed = useCallback(
    (next: ReplaySpeed) => {
      setSpeedUi(next);
      if (replay?.state === 'PLAYING' || replay?.state === 'PAUSED')
        send({ action: 'setSpeed', speed: next });
    },
    [replay?.state, send, setSpeedUi],
  );

  const seek = useCallback(
    (sequence: number) => send({ action: 'seek', sequence }),
    [send],
  );

  return {
    replay,
    speed,
    primary,
    runPrimary,
    changeSpeed,
    seek,
    pending: mutation.isPending,
    error: mutation.error,
  };
};

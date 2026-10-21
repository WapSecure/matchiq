'use client';

import type {
  ReplayCommand,
  ReplaySpeed,
  ReplayStatus,
} from '@matchiq/contracts';
import { useCallback, useEffect, useState } from 'react';
import { POLL_MS } from '@/constants/api';
import { fetchReplayStatus } from '@/lib/api/endpoints';
import { useReplayCommand } from '@/lib/api/hooks';
import { useMatchStore, useMatchStoreApi, useStudioUi } from '../store';

export type TransportAction = 'start' | 'pause' | 'resume';

const PRIMARY: Record<ReplayStatus['state'], TransportAction | null> = {
  IDLE: 'start',
  PLAYING: 'pause',
  PAUSED: 'resume',
  COMPLETED: null,
};

const confirms = (status: ReplayStatus | null, target: ReplayStatus) =>
  status !== null &&
  status.state === target.state &&
  status.speed === target.speed;

/**
 * Sends replay commands for a session. The 202 body is only a prediction, so
 * the UI shows it as "awaiting" until the worker's `replay.status` confirms;
 * if none arrives in time the persisted status is read back over REST.
 */
export const useReplayTransport = (sessionId: string) => {
  const store = useMatchStoreApi();
  const mutation = useReplayCommand(sessionId);
  const replay = useMatchStore((s) => s.replay);
  const fallbackSpeed = useStudioUi((s) => s.speed);
  const setSpeedUi = useStudioUi((s) => s.setSpeed);
  const [target, setTarget] = useState<ReplayStatus | null>(null);
  const awaiting = target !== null && !confirms(replay, target);

  useEffect(() => {
    if (replay) setSpeedUi(replay.speed);
  }, [replay, setSpeedUi]);

  useEffect(() => {
    if (!awaiting) return undefined;
    const timer = setTimeout(() => {
      fetchReplayStatus(sessionId)
        .then((s) => store.getState().applyReplayStatus(s, 'rest'))
        .catch(() => undefined)
        .finally(() => setTarget(null));
    }, POLL_MS.replayConfirm);
    return () => clearTimeout(timer);
  }, [awaiting, sessionId, store]);

  const send = useCallback(
    (command: ReplayCommand) => {
      setTarget(null);
      mutation.mutate(command, { onSuccess: (ack) => setTarget(ack) });
    },
    [mutation],
  );

  const primary = replay ? PRIMARY[replay.state] : null;
  const speed = (awaiting ? target.speed : replay?.speed) ?? fallbackSpeed;

  const runPrimary = useCallback(() => {
    if (primary === 'start') send({ action: 'start', speed });
    else if (primary) send({ action: primary });
  }, [primary, send, speed]);

  const changeSpeed = useCallback(
    (next: ReplaySpeed) => {
      if (replay && replay.state !== 'COMPLETED')
        send({ action: 'setSpeed', speed: next });
    },
    [replay, send],
  );

  const seek = useCallback(
    (sequence: number) => {
      if (replay && sequence > replay.appliedSequence)
        send({ action: 'seek', sequence });
    },
    [replay, send],
  );

  return {
    replay,
    speed,
    primary,
    runPrimary,
    changeSpeed,
    seek,
    pending: mutation.isPending,
    awaiting,
    error: mutation.error,
  };
};

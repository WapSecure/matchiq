import type {
  MatchEvent,
  MatchSnapshot,
  ReplayStatus,
  StreamMessage,
} from '@matchiq/contracts';
import { createStore, type StoreApi } from 'zustand/vanilla';
import type { ConnectionStatus } from '@/lib/stream';
import { reduceEvents } from './reduce-events';
import {
  initialMatchData,
  reduceMessages,
  reduceReplay,
} from './reduce-message';
import { reduceSnapshot } from './reduce-snapshot';
import type { MatchData } from './types';

export type MatchActions = {
  /** Applies a batch in order with a single store notification. */
  applyMessages: (messages: readonly StreamMessage[]) => void;
  applySnapshot: (snapshot: MatchSnapshot, authoritative?: boolean) => void;
  applyEvents: (events: readonly MatchEvent[]) => void;
  /** `seek` marks a status returned by our own seek command. */
  applyReplayStatus: (status: ReplayStatus, seek?: boolean) => void;
  setConnection: (connection: ConnectionStatus) => void;
};

export type MatchStoreState = MatchData & MatchActions;
export type MatchStore = StoreApi<MatchStoreState>;

export const createMatchStore = (fixtureId: string): MatchStore =>
  createStore<MatchStoreState>()((set) => ({
    ...initialMatchData(fixtureId),
    applyMessages: (messages) => {
      if (messages.length === 0) return;
      set((state) => reduceMessages(state, messages));
    },
    applySnapshot: (snapshot, authoritative = false) =>
      set((state) => reduceSnapshot(state, snapshot, authoritative)),
    applyEvents: (events) => set((state) => reduceEvents(state, events)),
    applyReplayStatus: (status, seek = false) =>
      set((state) => reduceReplay(state, status, seek)),
    setConnection: (connection) => set({ connection }),
  }));

'use client';

import { createContext, type ReactNode, useContext, useState } from 'react';
import { useStore } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import {
  createMatchStore,
  type MatchStore,
  type MatchStoreState,
} from './match-store';

const MatchStoreContext = createContext<MatchStore | null>(null);

type MatchStoreProviderProps = {
  fixtureId: string;
  /** Injected in tests; otherwise one store is created per mounted studio. */
  store?: MatchStore;
  children: ReactNode;
};

export function MatchStoreProvider({
  fixtureId,
  store,
  children,
}: MatchStoreProviderProps) {
  const [value] = useState(() => store ?? createMatchStore(fixtureId));
  return (
    <MatchStoreContext.Provider value={value}>
      {children}
    </MatchStoreContext.Provider>
  );
}

export const useMatchStoreApi = (): MatchStore => {
  const store = useContext(MatchStoreContext);
  if (!store) throw new Error('useMatchStore requires <MatchStoreProvider>');
  return store;
};

export const useMatchStore = <T,>(selector: (state: MatchStoreState) => T): T =>
  useStore(useMatchStoreApi(), selector);

/** For selectors that build arrays or objects; compares one level deep. */
export const useMatchStoreShallow = <T,>(
  selector: (state: MatchStoreState) => T,
): T => useStore(useMatchStoreApi(), useShallow(selector));

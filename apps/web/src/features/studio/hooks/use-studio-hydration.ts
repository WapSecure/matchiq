'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useMatchStore, useMatchStoreApi, useStudioUi } from '../store';
import { hydrateNarratives, hydrateStudio } from './hydrate';

const ignore = (): void => undefined;

/**
 * Loads read models whenever the store asks (stream accepted without a resume
 * point), and the narratives of each persona and locale the viewer switches to.
 */
export const useStudioHydration = (fixtureId: string): void => {
  const store = useMatchStoreApi();
  const queryClient = useQueryClient();
  const token = useMatchStore((s) => s.hydrationToken);
  const persona = useStudioUi((s) => s.persona);
  const locale = useStudioUi((s) => s.locale);

  useEffect(() => {
    if (token === 0) return;
    const { persona: p, locale: l } = useStudioUi.getState();
    hydrateStudio(
      { queryClient, store, fixtureId },
      { persona: p, locale: l },
    ).catch(ignore);
  }, [fixtureId, queryClient, store, token]);

  useEffect(() => {
    if (store.getState().hydrationToken === 0) return;
    hydrateNarratives({ queryClient, store, fixtureId }, persona, locale).catch(
      ignore,
    );
  }, [fixtureId, locale, persona, queryClient, store]);
};

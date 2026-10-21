'use client';

import type { ReplaySpeed } from '@matchiq/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { ROUTES } from '@/constants/navigation';
import { useCreateSession } from '@/lib/api/hooks';
import { queryKeys } from '@/lib/api/query-keys';
import { useStudioUi } from '@/features/studio/store';

/**
 * Creates a session of a template (the worker starts it at `speed`) and opens
 * its studio. Used by the lobby and by the studio's Restart.
 */
export const useStartSession = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setSpeed = useStudioUi((s) => s.setSpeed);
  const mutation = useCreateSession();
  const { mutate } = mutation;

  const start = useCallback(
    (templateId: string, speed: ReplaySpeed) => {
      setSpeed(speed);
      mutate(
        { templateId, speed },
        {
          onSuccess: ({ fixture, session }) => {
            queryClient.setQueryData(
              queryKeys.fixture(fixture.fixtureId),
              fixture,
            );
            void queryClient.invalidateQueries({
              queryKey: queryKeys.sessions(),
            });
            router.push(ROUTES.studio(session.sessionId));
          },
        },
      );
    },
    [mutate, queryClient, router, setSpeed],
  );

  return {
    start,
    pending: mutation.isPending,
    error: mutation.error,
    variables: mutation.variables,
  };
};

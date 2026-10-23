'use client';

import type {
  Locale,
  Persona,
  ReplayCommand,
  FaultPlanInput,
  ReplaySpeed,
} from '@matchiq/contracts';
import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { HTTP_STATUS, POLL_MS } from '@/constants/api';
import { isApiError } from './api-error';
import {
  createSession,
  fetchAgentRuns,
  fetchFixture,
  fetchNarratives,
  fetchRecap,
  fetchReplayStatus,
  fetchSessionsPage,
  fetchTemplates,
  sendReplayCommand,
} from './endpoints';
import type { PageRequest } from './endpoints';
import { queryKeys } from './query-keys';

export const useTemplates = () =>
  useQuery({
    queryKey: queryKeys.templates(),
    queryFn: ({ signal }) => fetchTemplates(signal),
  });

/** Keeps the previous page on screen while the next loads, so the list never jumps. */
export const useSessionsPage = (page: PageRequest) =>
  useQuery({
    queryKey: queryKeys.sessionsPage(page),
    queryFn: ({ signal }) => fetchSessionsPage(page, signal),
    refetchInterval: POLL_MS.sessions,
    placeholderData: keepPreviousData,
  });

export const useCreateSession = () =>
  useMutation({
    mutationFn: ({
      templateId,
      speed,
      faultPlan,
    }: {
      templateId: string;
      speed: ReplaySpeed;
      faultPlan?: FaultPlanInput;
    }) => createSession(templateId, speed, faultPlan),
  });

export const useFixture = (fixtureId: string) =>
  useQuery({
    queryKey: queryKeys.fixture(fixtureId),
    queryFn: ({ signal }) => fetchFixture(fixtureId, signal),
  });

export const useReplayCommand = (sessionId: string) =>
  useMutation({
    mutationFn: (command: ReplayCommand) =>
      sendReplayCommand(sessionId, command),
  });

const notReady = (error: unknown): boolean =>
  isApiError(error) && error.status === HTTP_STATUS.notFound;

/**
 * True once the replay has reached full time, or when the fixture has no
 * replay at all (404). Polls the replay status, which answers 200 throughout,
 * so callers need not poll a 404 recap to find out.
 */
export const useReplayFinished = (fixtureId: string): boolean => {
  const status = useQuery({
    queryKey: queryKeys.replay(fixtureId),
    queryFn: ({ signal }) => fetchReplayStatus(fixtureId, signal),
    retry: (count, error) => !notReady(error) && count < 2,
    refetchInterval: (query) =>
      query.state.data?.state === 'COMPLETED' || notReady(query.state.error)
        ? false
        : POLL_MS.replayStatus,
  });
  return status.data?.state === 'COMPLETED' || notReady(status.error);
};

/** 404 `recap-not-ready` until full time; polled until it exists. */
export const useRecap = (
  fixtureId: string,
  { enabled = true }: { enabled?: boolean } = {},
) =>
  useQuery({
    queryKey: queryKeys.recap(fixtureId),
    queryFn: ({ signal }) => fetchRecap(fixtureId, signal),
    enabled,
    retry: (count, error) => !notReady(error) && count < 2,
    refetchInterval: (query) =>
      query.state.data ? false : notReady(query.state.error) && POLL_MS.recap,
  });

export const useAgentRuns = (fixtureId: string) =>
  useQuery({
    queryKey: queryKeys.agentRuns(fixtureId),
    queryFn: ({ signal }) => fetchAgentRuns(fixtureId, signal),
    refetchInterval: POLL_MS.agentRuns,
  });

export const useNarratives = (
  fixtureId: string,
  persona: Persona,
  locale: Locale,
  { enabled = true }: { enabled?: boolean } = {},
) =>
  useQuery({
    queryKey: queryKeys.narratives(fixtureId, { persona, locale }),
    queryFn: ({ signal }) =>
      fetchNarratives(fixtureId, { persona, locale }, signal),
    enabled,
  });

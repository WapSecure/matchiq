'use client';

import type {
  Locale,
  Persona,
  ReplayCommand,
  FaultPlanInput,
  ReplaySpeed,
} from '@matchiq/contracts';
import { useMutation, useQuery } from '@tanstack/react-query';
import { HTTP_STATUS, POLL_MS } from '@/constants/api';
import { isApiError } from './api-error';
import {
  createSession,
  fetchAgentRuns,
  fetchFixture,
  fetchNarratives,
  fetchRecap,
  fetchSessions,
  fetchTemplates,
  sendReplayCommand,
} from './endpoints';
import { queryKeys } from './query-keys';

export const useTemplates = () =>
  useQuery({
    queryKey: queryKeys.templates(),
    queryFn: ({ signal }) => fetchTemplates(signal),
  });

export const useSessions = () =>
  useQuery({
    queryKey: queryKeys.sessions(),
    queryFn: ({ signal }) => fetchSessions(undefined, signal),
    refetchInterval: POLL_MS.sessions,
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

/** 404 `recap-not-ready` until full time; polled until it exists. */
export const useRecap = (fixtureId: string) =>
  useQuery({
    queryKey: queryKeys.recap(fixtureId),
    queryFn: ({ signal }) => fetchRecap(fixtureId, signal),
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

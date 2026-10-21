'use client';

import type { ReplayCommand } from '@matchiq/contracts';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  type EventsQuery,
  fetchFixture,
  fetchFixtureEvents,
  fetchFixtures,
  fetchMatchState,
  sendReplayCommand,
} from './endpoints';
import { queryKeys } from './query-keys';

type QueryToggle = { enabled?: boolean };

export const useFixtures = () =>
  useQuery({
    queryKey: queryKeys.fixtures(),
    queryFn: ({ signal }) => fetchFixtures(signal),
  });

export const useFixture = (fixtureId: string) =>
  useQuery({
    queryKey: queryKeys.fixture(fixtureId),
    queryFn: ({ signal }) => fetchFixture(fixtureId, signal),
  });

export const useFixtureEvents = (
  fixtureId: string,
  query: EventsQuery,
  { enabled = true }: QueryToggle = {},
) =>
  useQuery({
    queryKey: queryKeys.events(fixtureId, query),
    queryFn: ({ signal }) => fetchFixtureEvents(fixtureId, query, signal),
    enabled,
  });

/** Snapshots are pushed over the stream; this query seeds and reconciles. */
export const useMatchState = (fixtureId: string) =>
  useQuery({
    queryKey: queryKeys.state(fixtureId),
    queryFn: ({ signal }) => fetchMatchState(fixtureId, signal),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

export const useReplayCommand = (fixtureId: string) =>
  useMutation({
    mutationFn: (command: ReplayCommand) =>
      sendReplayCommand(fixtureId, command),
  });

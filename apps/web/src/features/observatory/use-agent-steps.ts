import { AgentStepTrace } from '@matchiq/contracts';
import { useQuery } from '@tanstack/react-query';
import {
  AGENT_STEPS_QUERY_KEY,
  AGENT_STEPS_STALE_MS,
  AGENT_TRACE_PATH,
  NOT_FOUND_STATUS,
} from '@/constants/agent-steps';
import { ApiError } from '@/lib/api/api-error';
import { requestJson } from '@/lib/api/http-client';
import type { InsightTrace } from '@/lib/api/trace-schemas';

/** Null when the run stored no hand-offs, e.g. templates published without the agents. */
const fetchAgentSteps = async (
  correlationId: string,
  signal?: AbortSignal,
): Promise<AgentStepTrace | null> => {
  try {
    return await requestJson(AGENT_TRACE_PATH(correlationId), AgentStepTrace, {
      signal,
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === NOT_FOUND_STATUS)
      return null;
    throw error;
  }
};

export const correlationIdOf = (trace: InsightTrace): string | undefined =>
  trace.runs[0]?.correlationId;

/** `GET /agents/traces/{correlationId}`, once the moment's narratives are published. */
export const useAgentSteps = (trace: InsightTrace) => {
  const correlationId = correlationIdOf(trace);
  const ready = correlationId !== undefined && trace.publication !== 'PENDING';
  return {
    ready,
    query: useQuery({
      queryKey: [AGENT_STEPS_QUERY_KEY, correlationId, trace.publication],
      queryFn: ({ signal }) => fetchAgentSteps(correlationId ?? '', signal),
      enabled: ready,
      staleTime: AGENT_STEPS_STALE_MS,
    }),
  };
};

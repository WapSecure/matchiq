import { AgentStepTrace } from '@matchiq/contracts';
import { useQuery } from '@tanstack/react-query';
import {
  AGENT_STEPS_QUERY_KEY,
  AGENT_STEPS_STALE_MS,
  AGENT_TRACE_PATH,
} from '@/constants/agent-steps';
import { requestJsonOrNull } from '@/lib/api/http-client';
import type { InsightTrace } from '@/lib/api/trace-schemas';

/** Null when the run stored no handoffs, e.g. templates published without the agents. */
const fetchAgentSteps = async (
  correlationId: string,
  signal?: AbortSignal,
): Promise<AgentStepTrace | null> => {
  return requestJsonOrNull(AGENT_TRACE_PATH(correlationId), AgentStepTrace, {
    signal,
  });
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

import type { ModelProvider } from '@matchiq/contracts';
import {
  type FallbackGroup,
  FILTER_ORDER,
  type MomentFilter,
  PERCENT,
} from '@/constants/fact-checks';
import type { InsightTrace } from '@/lib/api/trace-schemas';
import { faultOf } from './fault-chain';
import { fallbackGroup } from './plain-trace';

const MATCHES: Record<MomentFilter, (t: InsightTrace) => boolean> = {
  ALL: () => true,
  AGENT: (t) => t.publication === 'AGENT',
  TEMPLATE: (t) => t.publication === 'TEMPLATE',
  SIMULATED: (t) => faultOf(t.runs) !== null,
};

export const filterTraces = (
  traces: readonly InsightTrace[],
  filter: MomentFilter,
): InsightTrace[] => traces.filter(MATCHES[filter]);

export const filterCounts = (
  traces: readonly InsightTrace[],
): Record<MomentFilter, number> =>
  Object.fromEntries(
    FILTER_ORDER.map((f) => [f, traces.filter(MATCHES[f]).length]),
  ) as Record<MomentFilter, number>;

/** Standard-wording moments counted by why, largest group first. */
export const fallbackGroups = (
  traces: readonly InsightTrace[],
): { group: FallbackGroup; count: number }[] => {
  const counts = new Map<FallbackGroup, number>();
  for (const t of traces) {
    if (t.publication !== 'TEMPLATE') continue;
    const g = fallbackGroup(t.fallbackReason);
    counts.set(g, (counts.get(g) ?? 0) + 1);
  }
  return [...counts]
    .map(([group, count]) => ({ group, count }))
    .sort((a, b) => b.count - a.count);
};

export const summarise = (traces: readonly InsightTrace[]) => {
  const count = (p: InsightTrace['publication']) =>
    traces.filter((t) => t.publication === p).length;
  const providers = [
    ...new Set(traces.flatMap((t) => t.runs.map((r) => r.provider))),
  ].sort() as ModelProvider[];
  const agent = count('AGENT');
  return {
    total: traces.length,
    agent,
    template: count('TEMPLATE'),
    pending: count('PENDING'),
    agentPct:
      traces.length === 0 ? 0 : Math.round((agent / traces.length) * PERCENT),
    simulated: traces.filter(MATCHES.SIMULATED).length,
    rejected: traces.reduce((n, t) => n + (t.gate?.rejected.length ?? 0), 0),
    providers,
  };
};

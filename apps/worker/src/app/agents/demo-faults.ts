import {
  faultApplies,
  type FaultPlan,
  type FaultScenario,
  type Insight,
  type PipelineResult,
} from '@matchiq/contracts';
import { DEMO_FAULTS } from '../constants';

/**
 * The demo fault for one insight of a session (ADR-0017), or undefined.
 * Insights are counted in detection order among the plan's kinds, so a
 * replay of the same template faults the same insights every time.
 */
export const faultFor = (
  plan: FaultPlan | undefined,
  insights: readonly Insight[],
  insightId: string,
): FaultScenario | undefined => {
  if (plan === undefined) return undefined;
  const kinds = plan.insightKinds;
  const eligible = insights.filter(
    (i) => kinds === undefined || kinds.includes(i.kind),
  );
  const ordinal = eligible.findIndex((i) => i.insightId === insightId) + 1;
  return faultApplies(plan, ordinal) ? plan.scenario : undefined;
};

/**
 * GATE_REJECT: simulates an agents service that let an ungrounded citation
 * through, so the worker's deterministic publish gate is seen rejecting it.
 */
export const tamperForGate = (result: PipelineResult): PipelineResult => {
  const index = result.narratives.findIndex((n) => n.source === 'AGENT');
  const target = result.narratives[index];
  if (target === undefined) return result;
  const narratives = [...result.narratives];
  narratives[index] = {
    ...target,
    citedValues: [...target.citedValues, DEMO_FAULTS.injectedCitation],
  };
  const note = DEMO_FAULTS.gateNote(target.persona, target.locale);
  const runs = result.runs.map((run, i) => ({
    ...run,
    faultInjected: 'GATE_REJECT' as const,
    ...(i === 0 ? { faultNote: note } : {}),
  }));
  return { ...result, narratives, runs };
};

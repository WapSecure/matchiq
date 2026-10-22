import { z } from 'zod';
import { LIMITS } from './constants.js';
import { InsightKind } from './insight.js';

/**
 * Demo-only failure scenarios (ADR-0017). Each is simulated deterministically
 * so the Observatory can show a recovery chain; none is ever real inference.
 */
export const FaultScenario = z
  .enum(['WRITER_REVISE', 'MODEL_TIMEOUT', 'GATE_REJECT'])
  .meta({ id: 'FaultScenario' });

/**
 * Which insights of one replay session are faulted: those of `insightKinds`
 * (every kind when absent), and of those the 1st, (1 + everyNth)th, …
 */
export const FaultPlan = z
  .strictObject({
    scenario: FaultScenario,
    insightKinds: z.array(InsightKind).min(1).optional(),
    everyNth: z.int().min(1).max(LIMITS.faultEveryNthMax).default(1),
  })
  .meta({ id: 'FaultPlan' });

/** True when the insight at 1-based `ordinal` among the plan's kinds is faulted. */
export const faultApplies = (
  plan: Pick<FaultPlan, 'everyNth'>,
  ordinal: number,
): boolean => ordinal >= 1 && (ordinal - 1) % plan.everyNth === 0;

export type FaultScenario = z.infer<typeof FaultScenario>;
export type FaultPlan = z.infer<typeof FaultPlan>;
export type FaultPlanInput = z.input<typeof FaultPlan>;

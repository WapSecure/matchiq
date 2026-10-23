import type { AgentStep, AgentStepTrace } from '@matchiq/contracts';
import { and, asc, eq } from 'drizzle-orm';
import type { Database, Transaction } from '../client.js';
import type { FixtureKey } from '../ports.js';
import { agentSteps } from '../schema/agent-steps-table.js';
import { withTenant } from './tenant-scope.js';

/** Steps are immutable; a retried write of the same run keeps the first copy. */
export const insertAgentSteps = async (
  tx: Transaction,
  key: FixtureKey,
  insightId: string,
  steps: readonly AgentStep[],
): Promise<void> => {
  if (steps.length === 0) return;
  await tx
    .insert(agentSteps)
    .values(
      steps.map((step) => ({
        orgId: key.orgId,
        fixtureId: key.fixtureId,
        insightId,
        correlationId: step.correlationId,
        runId: step.runId,
        stepIndex: step.stepIndex,
        role: step.role,
        decision: step.decision,
        payload: step,
      })),
    )
    .onConflictDoNothing();
};

/** Every step of one run in the caller's organisation; null when it has none (ADR-0018). */
export const readAgentStepTrace = async (
  db: Database,
  orgId: string,
  correlationId: string,
): Promise<AgentStepTrace | null> => {
  const rows = await withTenant(db, orgId, (tx) =>
    tx
      .select({
        fixtureId: agentSteps.fixtureId,
        insightId: agentSteps.insightId,
        runId: agentSteps.runId,
        payload: agentSteps.payload,
      })
      .from(agentSteps)
      .where(
        and(
          eq(agentSteps.orgId, orgId),
          eq(agentSteps.correlationId, correlationId),
        ),
      )
      .orderBy(asc(agentSteps.stepIndex)),
  );
  const [first] = rows;
  if (first === undefined) return null;
  return {
    correlationId,
    runId: first.runId,
    fixtureId: first.fixtureId,
    insightId: first.insightId,
    steps: rows.map((row) => row.payload),
  };
};

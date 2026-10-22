import {
  PipelineRequest,
  SCHEMA_VERSION,
  type FaultScenario,
  type Fixture,
  type Insight,
} from '@matchiq/contracts';
import {
  LOCALES,
  PERSONAS,
  PRIMARY_LOCALE,
  PUBLISH_POLICY_VERSION,
} from '../constants';
import { allowlistOf, correlationIdFor, runIdFor } from './artifacts';

export interface PipelineRequestInput {
  readonly orgId: string;
  readonly fixture: Fixture;
  readonly insight: Insight;
  readonly revision: number;
  readonly deadlineMs: number;
  /** Demo fault for this insight (ADR-0017); absent for every ordinary run. */
  readonly fault?: FaultScenario;
}

/**
 * One immutable FactPacket for the agents service: the insight and its
 * evidence envelope, the fixture's entity allowlist, every persona and
 * locale. Run and correlation ids are derived from the job's idempotency key.
 */
export const buildPipelineRequest = (
  input: PipelineRequestInput,
): PipelineRequest => {
  const { fixture, insight, revision } = input;
  return PipelineRequest.parse({
    schemaVersion: SCHEMA_VERSION,
    packet: {
      schemaVersion: SCHEMA_VERSION,
      runId: runIdFor(fixture.fixtureId, insight.insightId, revision),
      correlationId: correlationIdFor(
        fixture.fixtureId,
        insight.insightId,
        revision,
      ),
      orgId: input.orgId,
      fixtureId: fixture.fixtureId,
      insight,
      entities: allowlistOf(fixture),
      persona: PERSONAS[0],
      locale: PRIMARY_LOCALE,
      deadlineMs: input.deadlineMs,
      policyVersion: PUBLISH_POLICY_VERSION,
    },
    personas: [...PERSONAS],
    locales: [...LOCALES],
    ...(input.fault && { fault: input.fault }),
  });
};

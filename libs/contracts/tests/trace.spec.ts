import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AgentStep, PipelineResult, TRACE_LIMITS } from '../src/index.js';

const result = JSON.parse(
  readFileSync(
    join(import.meta.dirname, '..', 'samples', 'PipelineResult.json'),
    'utf8',
  ),
) as { steps: Record<string, unknown>[] } & Record<string, unknown>;
const [sampleStep] = result.steps;

describe('agent step contracts', () => {
  it('accepts the sample handoff record', () => {
    expect(AgentStep.safeParse(sampleStep).success).toBe(true);
  });

  it('rejects a checksum that is not SHA-256 hex', () => {
    const bad = { ...sampleStep, inputChecksum: 'abc' };
    expect(AgentStep.safeParse(bad).success).toBe(false);
  });

  it('rejects an unknown decision and unknown fields', () => {
    expect(
      AgentStep.safeParse({ ...sampleStep, decision: 'MAYBE' }).success,
    ).toBe(false);
    expect(AgentStep.safeParse({ ...sampleStep, prompt: 'x' }).success).toBe(
      false,
    );
  });

  it('defaults steps to empty for a service that predates them', () => {
    const older: Record<string, unknown> = { ...result };
    delete older['steps'];
    const parsed = PipelineResult.parse(older);
    expect(parsed.steps).toEqual([]);
  });

  it('caps the number of steps per run', () => {
    const steps = Array.from(
      { length: TRACE_LIMITS.maxAgentSteps + 1 },
      () => sampleStep,
    );
    expect(PipelineResult.safeParse({ ...result, steps }).success).toBe(false);
  });
});

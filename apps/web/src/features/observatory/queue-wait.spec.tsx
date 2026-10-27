import type { AgentStep } from '@matchiq/contracts';
import { render, screen } from '@testing-library/react';
import { trace } from '@/test/session-factories';
import { AgentStepItem } from './agent-step-item';
import { hasQueueWait, queueWaitLine } from './queue-wait';

const STEP: AgentStep = {
  stepIndex: 0,
  role: 'NARRATIVE_WRITER',
  decision: 'PASS',
  reasonCode: 'DRAFTED',
  latencyMs: 24_000,
  evidenceEventIds: [],
  metricRefs: [],
} as unknown as AgentStep;

describe('queue wait line', () => {
  it('says how long the moment waited once it reaches two seconds', () => {
    expect(queueWaitLine(24_000)).toBe(
      'Waited 24 s in the queue before writing started',
    );
    expect(queueWaitLine(2_000)).not.toBeNull();
  });

  it('stays quiet when under the threshold or unknown', () => {
    expect(queueWaitLine(1_999)).toBeNull();
    expect(queueWaitLine(undefined)).toBeNull();
    expect(hasQueueWait(undefined)).toBe(false);
  });

  it('accepts traces with and without the field', () => {
    expect(trace().queueWaitMs).toBeUndefined();
    expect(trace({ queueWaitMs: 5_000 }).queueWaitMs).toBe(5_000);
  });

  it('does not present a queued step time as model time', () => {
    render(
      <ol>
        <AgentStepItem step={STEP} waited />
      </ol>,
    );
    expect(screen.getByText('Step time 24s')).toBeInTheDocument();
    expect(screen.queryByText(/^Took/)).toBeNull();
  });

  it('keeps "Took" when there was no long wait', () => {
    render(
      <ol>
        <AgentStepItem step={STEP} />
      </ol>,
    );
    expect(screen.getByText('Took 24s')).toBeInTheDocument();
  });
});

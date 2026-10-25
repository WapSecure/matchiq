import type { WorkerEnv } from '@matchiq/config';
import { FALLBACK_REASONS } from '../constants';
import type { AgentPipelineDeps } from '../infrastructure/bundles';
import type { SessionManager } from '../replay/session-manager.service';
import type { WorkerMetrics } from '../telemetry/worker-metrics';
import { InsightPipelineService } from './insight-pipeline.service';

jest.mock('../pipeline/publication', () => ({
  templatePublication: (input: { reason: string }) => ({
    reason: input.reason,
    completion: { status: 'FALLBACK' },
  }),
  agentPublication: jest.fn(),
}));

const NOW = Date.UTC(2026, 9, 25, 12, 0, 0);
const KEY = { orgId: 'org_1', fixtureId: 'fx_1' };
const JOB = { ...KEY, insightId: 'in_1', revision: 1 };

const build = (kind = 'PRESSURE_SWING') => {
  const run = jest.fn();
  const publish = jest.fn().mockResolvedValue('written');
  const pipelineCall = jest.fn();
  const deps = {
    clock: { now: () => new Date(NOW) },
    reader: {
      pendingInsight: () => Promise.resolve({ insightId: 'in_1', kind }),
    },
    fixtures: { get: () => Promise.resolve({ fixtureId: 'fx_1' }) },
    client: { run },
  } as unknown as AgentPipelineDeps;
  const env = {
    AI_ENABLED: true,
    AGENT_MAX_AGE_SECONDS: 180,
    AGENT_CIRCUIT_FAILURE_THRESHOLD: 5,
    AGENT_CIRCUIT_COOLDOWN_MS: 30_000,
  } as unknown as WorkerEnv;
  const service = new InsightPipelineService(
    env,
    deps,
    { publish } as unknown as SessionManager,
    { pipelineCall } as unknown as WorkerMetrics,
  );
  return { service, run, publish, pipelineCall };
};

describe('InsightPipelineService staleness', () => {
  it('keeps the template and never calls the agents once the moment is older than the limit', async () => {
    const { service, run, publish, pipelineCall } = build();
    await service.process(JOB, {
      attemptsMade: 0,
      maxAttempts: 3,
      enqueuedAtMs: NOW - 181_000,
    });
    expect(run).not.toHaveBeenCalled();
    expect(pipelineCall).toHaveBeenCalledWith('stale', 0);
    expect(publish).toHaveBeenCalledWith(
      KEY,
      expect.objectContaining({
        claim: 'TEMPLATE',
        publication: expect.objectContaining({
          reason: FALLBACK_REASONS.skippedStale,
        }),
      }),
    );
  });

  it('does not treat a fresh moment as stale', async () => {
    const { service, pipelineCall } = build();
    await service.process(JOB, {
      attemptsMade: 0,
      maxAttempts: 1,
      enqueuedAtMs: NOW - 60_000,
    });
    expect(pipelineCall).not.toHaveBeenCalledWith('stale', 0);
  });

  it('keeps the template for milestone moments without calling the agents', async () => {
    const { service, run, publish, pipelineCall } = build('PLAYER_MILESTONE');
    await service.process(JOB, { attemptsMade: 0, maxAttempts: 1 });
    expect(run).not.toHaveBeenCalled();
    expect(pipelineCall).toHaveBeenCalledWith('template-only', 0);
    expect(publish).toHaveBeenCalledWith(
      KEY,
      expect.objectContaining({
        claim: 'TEMPLATE',
        publication: expect.objectContaining({
          reason: FALLBACK_REASONS.templateOnly,
        }),
      }),
    );
  });
});

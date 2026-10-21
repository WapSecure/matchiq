import { PipelineRequest } from '@matchiq/contracts';
import { firstOfKind, goldenMoments } from '../../test/golden';
import { PUBLISH_POLICY_VERSION } from '../constants';
import { buildPipelineRequest } from './pipeline-request';

describe('buildPipelineRequest', () => {
  it('packs the insight, entity allowlist and every audience variant', async () => {
    const { fixture, insights } = await goldenMoments('comeback');
    const goal = firstOfKind(insights, 'GOAL');
    const input = {
      orgId: 'org_demo',
      fixture,
      insight: goal,
      revision: 1,
      deadlineMs: 8_000,
    };
    const request = buildPipelineRequest(input);

    expect(PipelineRequest.parse(request)).toEqual(request);
    expect(request.personas).toEqual(['CASUAL', 'ANALYST', 'BROADCAST']);
    expect(request.locales).toEqual(['en-GB', 'fr-FR', 'es-ES', 'pcm-NG']);
    expect(request.packet).toMatchObject({
      orgId: 'org_demo',
      fixtureId: fixture.fixtureId,
      insight: goal,
      deadlineMs: 8_000,
      policyVersion: PUBLISH_POLICY_VERSION,
    });
    expect(request.packet.entities.teams.map((t) => t.name)).toEqual([
      fixture.home.name,
      fixture.away.name,
    ]);
    expect(request.packet.entities.players).toHaveLength(
      fixture.home.players.length + fixture.away.players.length,
    );
  });

  it('derives run and correlation ids from the idempotency key', async () => {
    const { fixture, insights } = await goldenMoments('comeback');
    const goal = firstOfKind(insights, 'GOAL');
    const base = {
      orgId: 'org_demo',
      fixture,
      insight: goal,
      deadlineMs: 8_000,
    };
    const first = buildPipelineRequest({ ...base, revision: 1 }).packet;
    const again = buildPipelineRequest({ ...base, revision: 1 }).packet;
    const next = buildPipelineRequest({ ...base, revision: 2 }).packet;
    expect(again.runId).toBe(first.runId);
    expect(again.correlationId).toBe(first.correlationId);
    expect(next.correlationId).not.toBe(first.correlationId);
  });
});

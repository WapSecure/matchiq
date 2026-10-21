import type { Fixture, Insight, PipelineResult } from '@matchiq/contracts';
import { fakePipelineResult } from '../../test/fake-agents';
import { firstOfKind, goldenMoments } from '../../test/golden';
import { buildPipelineRequest } from './pipeline-request';
import { agentPublication, templatePublication } from './publication';

const CREATED = '2026-10-24T15:00:00.000Z';

describe('publication decisions', () => {
  let fixture: Fixture;
  let insight: Insight;
  let result: PipelineResult;

  beforeAll(async () => {
    const golden = await goldenMoments('comeback');
    fixture = golden.fixture;
    insight = firstOfKind(golden.insights, 'SHOT_BURST');
    const request = buildPipelineRequest({
      orgId: 'org_demo',
      fixture,
      insight,
      revision: 1,
      deadlineMs: 8_000,
    });
    result = fakePipelineResult(request, fixture);
  });

  it('publishes every grounded agent draft and the gated overlay', () => {
    const publication = agentPublication({
      insight,
      fixture,
      result,
      createdAt: CREATED,
    });
    expect(publication.narratives).toHaveLength(9);
    expect(new Set(publication.narratives.map((n) => n.source))).toEqual(
      new Set(['AGENT']),
    );
    expect(publication.completion.status).toBe('PUBLISHED');
    expect(publication.completion.gateReport.rejected).toEqual([]);
    expect(publication.overlay?.headline).toMatch(/^Agent: /);
    expect(publication.runs).toEqual(result.runs);
  });

  it('rejects a draft citing an unsupported number and fills that variant from templates', () => {
    const [first, ...rest] = result.narratives;
    if (first === undefined) throw new Error('no drafts');
    const tampered = {
      ...result,
      narratives: [{ ...first, body: `${first.body} 42 corners.` }, ...rest],
    };
    const publication = agentPublication({
      insight,
      fixture,
      result: tampered,
      createdAt: CREATED,
    });
    expect(publication.narratives).toHaveLength(9);
    const replaced = publication.narratives.find(
      (n) => n.persona === first.persona && n.locale === first.locale,
    );
    expect(replaced?.source).toBe('TEMPLATE');
    expect(publication.completion.gateReport).toMatchObject({
      source: 'AGENT',
      templateNarratives: 1,
      rejected: [
        expect.objectContaining({
          codes: expect.arrayContaining(['UNSUPPORTED_NUMBER']),
        }),
      ],
    });
  });

  it('falls back entirely when every agent draft fails the gate', () => {
    const allBad = {
      ...result,
      narratives: result.narratives.map((d) => ({
        ...d,
        evidenceEventIds: ['ev_999999'],
      })),
      overlay: null,
    };
    const publication = agentPublication({
      insight,
      fixture,
      result: allBad,
      createdAt: CREATED,
    });
    expect(publication.completion.status).toBe('FALLBACK');
    expect(publication.completion.fallbackReason).toBeDefined();
    expect(publication.narratives.every((n) => n.source === 'TEMPLATE')).toBe(
      true,
    );
    expect(publication.overlay).toBeNull();
  });

  it('records a template AgentRun when the pipeline is not used', () => {
    const publication = templatePublication({
      insight,
      fixture,
      createdAt: CREATED,
      reason: 'agents service timed out',
      retries: 2,
    });
    expect(publication.narratives).toHaveLength(9);
    expect(publication.runs).toEqual([
      expect.objectContaining({
        provider: 'template',
        outcome: 'FALLBACK',
        retries: 2,
      }),
    ]);
    expect(publication.completion).toMatchObject({
      status: 'FALLBACK',
      fallbackReason: 'agents service timed out',
    });
  });
});

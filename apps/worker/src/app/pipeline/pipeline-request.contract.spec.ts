import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PipelineRequest } from '@matchiq/contracts';
import { GOLDEN_SCENARIOS, goldenMoments } from '../../test/golden';
import { buildPipelineRequest } from './pipeline-request';

const FIXTURES = join(__dirname, '../../../../agents/tests/fixtures');
const WORKER_REQUESTS = join(FIXTURES, 'worker_requests.json');
const REGENERATE = 'UPDATE_CONTRACT_FIXTURE';

/** First moment of each kind in every golden match, built exactly as the worker sends it. */
const sentRequests = async (): Promise<unknown> => {
  const requests: PipelineRequest[] = [];
  for (const name of GOLDEN_SCENARIOS) {
    const { fixture, insights } = await goldenMoments(name);
    const kinds = new Set<string>();
    for (const insight of insights) {
      if (kinds.has(insight.kind)) continue;
      kinds.add(insight.kind);
      requests.push(
        buildPipelineRequest({
          orgId: 'org_demo',
          fixture,
          insight,
          revision: 1,
          deadlineMs: 20_000,
        }),
      );
    }
  }
  return JSON.parse(JSON.stringify(requests));
};

/**
 * apps/agents/tests/test_contract_roundtrip.py loads these fixtures through the generated Pydantic
 * model and the worker's Zod schema. Pinning worker_requests.json to the real builder here keeps
 * that proof about what the worker sends. After an intended engine or contract change run
 * `UPDATE_CONTRACT_FIXTURE=1 pnpm nx test worker -- -t "agents contract"`, then format the file with prettier.
 */
describe('agents contract fixtures', () => {
  it('worker_requests.json is what buildPipelineRequest produces from engine output', async () => {
    const sent = await sentRequests();
    if (process.env[REGENERATE]) {
      writeFileSync(WORKER_REQUESTS, `${JSON.stringify(sent)}\n`);
    }
    const recorded: unknown = JSON.parse(readFileSync(WORKER_REQUESTS, 'utf8'));
    expect(recorded).toEqual(sent);
    expect((recorded as unknown[]).length).toBeGreaterThan(10);
  });

  it('every recorded request survives Zod parsing unchanged', () => {
    for (const file of ['worker_requests.json', 'comeback_requests.json']) {
      const recorded = JSON.parse(
        readFileSync(join(FIXTURES, file), 'utf8'),
      ) as unknown[];
      for (const request of recorded) {
        expect(PipelineRequest.parse(request)).toEqual(request);
      }
    }
  });
});

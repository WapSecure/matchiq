import type { AgentStep, AgentStepTrace } from '@matchiq/contracts';
import {
  createDatabase,
  PostgresPipelineUnitOfWork,
  PostgresUnitOfWork,
  sha256Hex,
  type DatabaseHandle,
  type FixtureKey,
} from '@matchiq/db';
import { buildTestFixture } from '@matchiq/db/testing';
import { jsonOf, startTestApp, type TestApp } from '../../test/test-app';

jest.setTimeout(40_000);

const ORG_A = 'org_demo';
const ORG_B = 'org_northbank';
const CORRELATION_ID = '5b0f3d4e-8c6a-4a51-9a3e-2f1d7c9b6e10';
const KEY: FixtureKey = { orgId: ORG_B, fixtureId: 'fx_traced' };

const step = (stepIndex: number, role: AgentStep['role']): AgentStep => ({
  stepIndex,
  role,
  runId: 'run_traced',
  correlationId: CORRELATION_ID,
  agentVersion: { promptVersion: '2.0.0', promptHash: 'b'.repeat(64) },
  provider: 'mock',
  fromStatus: 'DETECTED',
  toStatus: 'ANALYZED',
  decision: 'PASS',
  reasonCode: 'GROUNDED',
  reason: 'analysis grounded in the evidence',
  inputChecksum: 'c'.repeat(64),
  evidenceEventIds: ['ev_00101'],
  metricRefs: ['shots.home.rolling5m'],
  startedAt: '2026-10-24T15:00:00.000Z',
  latencyMs: 12,
  retries: 0,
});

/** Spec §29 `GET /agents/traces/{correlationId}`: permission-guarded and tenant-scoped. */
describe('agent step traces (integration)', () => {
  let t: TestApp;
  let db: DatabaseHandle;

  const get = (id: string, headers: Record<string, string> = {}) =>
    fetch(`${t.baseUrl}/agents/traces/${id}`, { headers });

  beforeAll(async () => {
    t = await startTestApp();
    db = createDatabase({ url: t.env.DATABASE_URL, poolMax: 2 });
    const fixture = buildTestFixture(KEY.fixtureId);
    await new PostgresUnitOfWork(db.db).transaction((tx) =>
      tx.insertFixture(ORG_B, fixture, sha256Hex(fixture)),
    );
    await new PostgresPipelineUnitOfWork(db.db).transaction((tx) =>
      tx.insertAgentSteps(KEY, 'in_traced', [
        step(1, 'NARRATIVE_WRITER'),
        step(0, 'MATCH_ANALYST'),
      ]),
    );
  });

  afterAll(async () => {
    await db.close();
    await t.close();
  });

  it('returns the owner every step in order', async () => {
    const res = await get(CORRELATION_ID, await t.bearer(['producer'], ORG_B));
    expect(res.status).toBe(200);
    const trace = await jsonOf<AgentStepTrace>(res);
    expect(trace).toMatchObject({
      correlationId: CORRELATION_ID,
      runId: 'run_traced',
      fixtureId: KEY.fixtureId,
      insightId: 'in_traced',
    });
    expect(trace.steps.map((s) => s.role)).toEqual([
      'MATCH_ANALYST',
      'NARRATIVE_WRITER',
    ]);
  });

  it('answers another organisation with a non-disclosing 404', async () => {
    const res = await get(CORRELATION_ID, await t.bearer(['producer'], ORG_A));
    expect(res.status).toBe(404);
    expect((await jsonOf(res)).type).toContain('trace-not-found');
    expect((await get(CORRELATION_ID)).status).toBe(404);
  });

  it('requires the traces permission', async () => {
    const res = await get(CORRELATION_ID, await t.bearer(['viewer'], ORG_B));
    expect(res.status).toBe(403);
  });

  it('rejects a malformed correlation id', async () => {
    const res = await get('not-a-uuid', await t.bearer(['producer'], ORG_B));
    expect(res.status).toBe(422);
  });
});

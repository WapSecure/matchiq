import type { StreamMessage } from '@matchiq/contracts';
import {
  PostgresEditorialUnitOfWork,
  type EditorialScope,
  type FixtureKey,
} from '@matchiq/db';
import {
  countOf,
  ORG,
  readStream,
  startTestWorker,
  type TestWorker,
} from '../../test/test-worker';

jest.setTimeout(120_000);

const TEMPLATE = 'fx_comeback_42';
const FREEZE_THROUGH = 1_000;

const publishedIds = (stream: readonly StreamMessage[]): Set<string> =>
  new Set(
    stream.flatMap((m) =>
      m.type === 'overlay.publish' ? [m.payload.overlayId] : [],
    ),
  );

describe('editorial policy on the publish path (integration)', () => {
  let t: TestWorker;
  let editorial: PostgresEditorialUnitOfWork;

  beforeAll(async () => {
    t = await startTestWorker();
    editorial = new PostgresEditorialUnitOfWork(t.db.db);
  });

  afterAll(() => t.close());

  const setControl = (
    scope: EditorialScope,
    scopeId: string,
    active: boolean,
  ) =>
    editorial.transaction((tx) =>
      tx.saveControl({
        orgId: ORG,
        scope,
        scopeId,
        active,
        reason: 'integration test',
        changedBy: 'operator',
      }),
    );

  const newSession = async (): Promise<FixtureKey> => {
    const created = await t.store.create({
      orgId: ORG,
      templateId: TEMPLATE,
      speed: 30,
    });
    if (created === null) throw new Error('template missing');
    return { orgId: ORG, fixtureId: created.fixture.fixtureId };
  };

  const play = async (key: FixtureKey) => {
    await t.sessions.handle({
      ...key,
      command: { action: 'start', speed: 30 },
    });
    t.scheduler.runAll();
    await t.sessions.whenIdle(key.fixtureId);
  };

  const overlayRows = async (key: FixtureKey) =>
    (
      await t.db.pool.query<{
        overlay_id: string;
        status: string;
        editorial_state: string | null;
        editorial_reason: string | null;
      }>(
        'select overlay_id, status, editorial_state, editorial_reason from overlay_cues where fixture_id = $1',
        [key.fixtureId],
      )
    ).rows;

  const auditCount = async (key: FixtureKey, action: string) =>
    (
      await t.db.pool.query<{ n: number }>(
        'select count(*)::int as n from audit_events where fixture_id = $1 and action = $2',
        [key.fixtureId, action],
      )
    ).rows[0]?.n ?? 0;

  it('keeps every cue off air for a frozen session while insights and narratives still publish', async () => {
    const key = await newSession();
    await setControl('FIXTURE', key.fixtureId, true);
    await play(key);

    const stream = await readStream(t, key);
    const insights = countOf(stream, 'insight.detected');
    expect(insights).toBeGreaterThan(0);
    expect(countOf(stream, 'narrative.ready')).toBe(insights * 12);
    expect(countOf(stream, 'overlay.publish')).toBe(0);
    expect(countOf(stream, 'overlay.retract')).toBe(0);

    const rows = await overlayRows(key);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.status === 'VERIFIED')).toBe(true);
    expect(rows.every((r) => r.editorial_state === 'HELD')).toBe(true);
    expect(rows.every((r) => r.editorial_reason === 'EDITORIAL_FREEZE')).toBe(
      true,
    );
    expect(await auditCount(key, 'overlay.held')).toBe(rows.length);

    expect(await t.reader.overlays(key)).toEqual([]);
    const traces = await t.reader.traces(key);
    expect(traces.some((tr) => tr.editorial.overlay === 'HELD')).toBe(true);
  });

  it('holds cues org-wide under the kill switch and resumes publishing after release', async () => {
    const key = await newSession();
    await setControl('ORG', ORG, true);
    try {
      await play(key);
    } finally {
      await setControl('ORG', ORG, false);
    }
    const stream = await readStream(t, key);
    expect(countOf(stream, 'overlay.publish')).toBe(0);
    const rows = await overlayRows(key);
    expect(rows.every((r) => r.editorial_reason === 'KILL_SWITCH')).toBe(true);

    const after = await newSession();
    await play(after);
    expect(
      countOf(await readStream(t, after), 'overlay.publish'),
    ).toBeGreaterThan(0);
  });

  it('resuming releases nothing that was held, only cues scheduled afterwards', async () => {
    const key = await newSession();
    await t.sessions.handle({
      ...key,
      command: { action: 'start', speed: 30 },
    });
    await t.sessions.handle({ ...key, command: { action: 'pause' } });
    await setControl('FIXTURE', key.fixtureId, true);
    await t.sessions.handle({
      ...key,
      command: { action: 'seek', sequence: FREEZE_THROUGH },
    });
    await t.sessions.whenIdle(key.fixtureId);
    const held = (await overlayRows(key)).filter(
      (r) => r.editorial_state === 'HELD',
    );
    expect(held.length).toBeGreaterThan(0);

    await setControl('FIXTURE', key.fixtureId, false);
    await t.sessions.handle({ ...key, command: { action: 'resume' } });
    t.scheduler.runAll();
    await t.sessions.whenIdle(key.fixtureId);

    const published = publishedIds(await readStream(t, key));
    expect(published.size).toBeGreaterThan(0);
    for (const row of held) expect(published.has(row.overlay_id)).toBe(false);
    const stillHeld = (await overlayRows(key)).filter(
      (r) => r.editorial_state === 'HELD',
    );
    expect(stillHeld.map((r) => r.overlay_id).sort()).toEqual(
      held.map((r) => r.overlay_id).sort(),
    );
  });
});

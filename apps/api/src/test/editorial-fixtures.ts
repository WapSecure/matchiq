import {
  createDatabase,
  findFixturesFolder,
  PostgresTemplateStore,
  seedTemplates,
} from '@matchiq/db';
import type pg from 'pg';
import { postJson, type TestApp } from './test-app';

export const TEMPLATE = 'fx_comeback_42';

export const seedDemoTemplates = async (t: TestApp): Promise<void> => {
  const db = createDatabase({ url: t.env.DATABASE_URL, poolMax: 1 });
  try {
    await seedTemplates(
      new PostgresTemplateStore(db.db),
      t.env.DEMO_ORG_ID,
      findFixturesFolder(),
    );
  } finally {
    await db.close();
  }
};

/** A replay session fixture (anonymous create), so kill-switch fan-out finds it. */
export const startSession = async (t: TestApp): Promise<string> => {
  const res = await postJson(
    `${t.baseUrl}/fixtures/${TEMPLATE}/sessions`,
    { speed: 30 },
    {},
  );
  if (res.status !== 201) throw new Error(`session: ${res.status}`);
  const body = (await res.json()) as { fixture: { fixtureId: string } };
  return body.fixture.fixtureId;
};

export const insertInsight = async (
  t: TestApp,
  fixtureId: string,
  input: { insightId: string; publication?: string },
): Promise<void> => {
  await t.sql.query(
    `insert into insights (org_id, fixture_id, insight_id, revision, kind, priority, period,
       match_clock_ms, status, publication, payload, detected_sequence)
     values ($1, $2, $3, 1, 'GOAL', 'P0', 1, 60000, 'DETECTED', $4, '{}'::jsonb, 10)`,
    [
      t.env.DEMO_ORG_ID,
      fixtureId,
      input.insightId,
      input.publication ?? 'PENDING',
    ],
  );
};

/** Stands in for a cue the worker put on air. */
export const insertOverlay = async (
  t: TestApp,
  fixtureId: string,
  input: { overlayId: string; insightId?: string; status?: string },
): Promise<void> => {
  await t.sql.query(
    `insert into overlay_cues (org_id, fixture_id, overlay_id, insight_id, revision, status,
       priority, period, clock_start_ms, clock_end_ms, payload, published_sequence)
     values ($1, $2, $3, $4, 1, $5, 90, 1, 60000, 67000, '{}'::jsonb, 10)`,
    [
      t.env.DEMO_ORG_ID,
      fixtureId,
      input.overlayId,
      input.insightId ?? null,
      input.status ?? 'LIVE',
    ],
  );
};

export interface StoredMessage {
  readonly type: string;
  readonly message: { payload: Record<string, unknown> };
}

export const messagesOf = async (
  sql: pg.Pool,
  fixtureId: string,
  type: string,
): Promise<StoredMessage[]> =>
  (
    await sql.query<StoredMessage>(
      'select type, message from stream_messages where fixture_id = $1 and type = $2 order by stream_sequence',
      [fixtureId, type],
    )
  ).rows;

export interface AuditRow {
  readonly id: string;
  readonly action: string;
  readonly actor: string;
  readonly actor_type: string;
  readonly target_type: string;
  readonly target_id: string;
  readonly fixture_id: string | null;
  readonly reason: string | null;
  readonly request_id: string | null;
  readonly before: Record<string, unknown> | null;
  readonly after: Record<string, unknown> | null;
}

export const auditsOf = async (
  sql: pg.Pool,
  action: string,
): Promise<AuditRow[]> =>
  (
    await sql.query<AuditRow>(
      'select * from audit_events where action = $1 order by created_at, id',
      [action],
    )
  ).rows;

export const reason = { reason: 'Wrong score shown on air' };

import type { OverlayCue } from '@matchiq/contracts';
import type { TestApp } from './test-app';

export const SLOT = { period: 1, startMs: 60_000, endMs: 67_000 } as const;

export const waitingCue = (
  fixtureId: string,
  name: string,
  revision = 1,
): OverlayCue => ({
  schemaVersion: 1,
  overlayId: `ov_${name}`,
  fixtureId,
  insightId: `in_${name}`,
  revision,
  kind: 'KEY_MOMENT',
  priority: 70,
  persona: 'BROADCAST',
  locale: 'en-GB',
  clockStartMs: SLOT.startMs,
  clockEndMs: SLOT.endMs,
  maxDisplayMs: 8_000,
  headline: `Synthetic moment ${name}`,
  body: 'Synthetic data',
  evidenceEventIds: ['ev_000001'],
  metricRefs: [],
  safeArea: { topPct: 8, rightPct: 6, bottomPct: 10, leftPct: 6 },
  status: 'VERIFIED',
  synthetic: true,
});

/** Stands in for a cue the worker held for approval in a MANUAL session. */
export const insertWaitingCue = async (
  t: TestApp,
  fixtureId: string,
  name: string,
  orgId = t.env.DEMO_ORG_ID,
): Promise<OverlayCue> => {
  const cue = waitingCue(fixtureId, name);
  await t.sql.query(
    `insert into insights (org_id, fixture_id, insight_id, revision, kind, priority, period,
       match_clock_ms, status, publication, payload, detected_sequence)
     values ($1, $2, $3, 1, 'GOAL', 'P0', 1, $4, 'DETECTED', 'TEMPLATE', '{}'::jsonb, 10)`,
    [orgId, fixtureId, cue.insightId, SLOT.startMs],
  );
  await t.sql.query(
    `insert into overlay_cues (org_id, fixture_id, overlay_id, insight_id, revision, status,
       priority, period, clock_start_ms, clock_end_ms, payload, published_sequence,
       editorial_state, editorial_reason)
     values ($1, $2, $3, $4, 1, 'VERIFIED', 70, $5, $6, $7, $8, 10,
       'AWAITING_APPROVAL', 'AWAITING_APPROVAL')`,
    [
      orgId,
      fixtureId,
      cue.overlayId,
      cue.insightId,
      SLOT.period,
      SLOT.startMs,
      SLOT.endMs,
      JSON.stringify(cue),
    ],
  );
  return cue;
};

/** Where the worker's applied events have moved the session clock. */
export const setSessionClock = async (
  t: TestApp,
  fixtureId: string,
  matchClockMs: number,
  period: number = SLOT.period,
): Promise<void> => {
  await t.sql.query(
    'update replay_sessions set period = $2, match_clock_ms = $3 where fixture_id = $1',
    [fixtureId, period, matchClockMs],
  );
};

export interface OverlayState {
  readonly status: string;
  readonly editorial_state: string | null;
  readonly editorial_reason: string | null;
  readonly clock_start_ms: number;
  readonly clock_end_ms: number;
  readonly priority: number;
}

export const overlayState = async (
  t: TestApp,
  overlayId: string,
): Promise<OverlayState | undefined> =>
  (
    await t.sql.query<OverlayState>(
      `select status, editorial_state, editorial_reason, clock_start_ms, clock_end_ms, priority
       from overlay_cues where overlay_id = $1`,
      [overlayId],
    )
  ).rows[0];

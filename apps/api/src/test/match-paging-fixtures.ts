import { randomUUID } from 'node:crypto';
import type { TestApp } from './test-app';

const PERSONAS = ['CASUAL', 'ANALYST'] as const;
const LOCALES = ['en-GB', 'fr-FR'] as const;

/** Inserted out of order, with ties, so only the keyset order can explain the result. */
const BASE_INSIGHTS: readonly [id: string, sequence: number][] = [
  ['in_a', 70],
  ['in_b', 60],
  ['in_c', 50],
  ['in_d', 40],
  ['in_e', 30],
  ['in_f', 20],
  ['in_y', 10],
  ['in_x', 10],
  ['in_g', 10],
];

const BASE_OVERLAYS: readonly [id: string, sequence: number, held: boolean][] =
  [
    ['ov_1', 30, false],
    ['ov_2', 20, false],
    ['ov_3', 20, false],
    ['ov_4', 10, false],
    ['ov_5', 10, false],
    ['ov_6', 5, true],
  ];

const ranked = <T>(rows: T[], key: (row: T) => (string | number)[]): T[] =>
  [...rows].sort((a, b) => {
    const [ka, kb] = [key(a), key(b)];
    for (let i = 0; i < ka.length; i += 1) {
      const [x, y] = [ka[i] ?? '', kb[i] ?? ''];
      if (x !== y) return x < y ? -1 : 1;
    }
    return 0;
  });

type Narr = { id: string; sequence: number; persona: string; locale: string };
type Seq = readonly [id: string, sequence: number];
type Scope = { t: TestApp; orgId: string; fixtureId: string };

export interface SeededMatch {
  readonly insightIds: string[];
  readonly narrativeIds: string[];
  readonly casualNarrativeIds: string[];
  readonly overlayIds: string[];
}

const insertInsight = (s: Scope, [id, sequence]: Seq) =>
  s.t.sql.query(
    `insert into insights (org_id, fixture_id, insight_id, revision, kind, priority, period,
       match_clock_ms, status, publication, payload, detected_sequence)
     values ($1, $2, $3, 1, 'GOAL', 'P0', 1, $4, 'DETECTED', 'TEMPLATE', $5::jsonb, $6)`,
    [
      s.orgId,
      s.fixtureId,
      id,
      sequence * 1000,
      JSON.stringify({ insightId: id, kind: 'GOAL' }),
      sequence,
    ],
  );

const insertNarrative = (s: Scope, insightId: string, n: Narr) =>
  s.t.sql.query(
    `insert into narratives (org_id, fixture_id, narrative_id, insight_id, persona, locale,
       source, revision, payload)
     values ($1, $2, $3, $4, $5, $6, 'TEMPLATE', 1, $7::jsonb)`,
    [
      s.orgId,
      s.fixtureId,
      n.id,
      insightId,
      n.persona,
      n.locale,
      JSON.stringify({
        narrativeId: n.id,
        persona: n.persona,
        locale: n.locale,
      }),
    ],
  );

const insertOverlay = (
  s: Scope,
  cue: { id: string; sequence: number; held: boolean; insightId: string },
) =>
  s.t.sql.query(
    `insert into overlay_cues (org_id, fixture_id, overlay_id, insight_id, revision, status,
       priority, period, clock_start_ms, clock_end_ms, payload, published_sequence, editorial_state)
     values ($1, $2, $3, $4, 1, 'LIVE', 90, 1, 60000, 67000, $5::jsonb, $6, $7)`,
    [
      s.orgId,
      s.fixtureId,
      cue.id,
      cue.insightId,
      JSON.stringify({ overlayId: cue.id }),
      cue.sequence,
      cue.held ? 'HELD' : null,
    ],
  );

const insertRun = (s: Scope, insightId: string, n: number) =>
  s.t.sql.query(
    `insert into agent_runs (org_id, fixture_id, insight_id, run_id, correlation_id, agent,
       provider, outcome, latency_ms, payload)
     values ($1, $2, $3, $4, $5, 'COMMENTATOR', 'mock', 'ACCEPTED', 10, $6::jsonb)`,
    [
      s.orgId,
      s.fixtureId,
      insightId,
      `run_${insightId}_${n}`,
      randomUUID(),
      JSON.stringify({ runId: `run_${insightId}_${n}` }),
    ],
  );

/** Narratives for the three latest insights, every persona in every locale. */
const seedNarratives = async (s: Scope, insights: readonly Seq[]) => {
  const rows: Narr[] = [];
  for (const [insightId, sequence] of insights.slice(0, 3)) {
    for (const persona of PERSONAS) {
      for (const locale of LOCALES) {
        const id = `nr_${insightId}_${persona}_${locale}`;
        const n = { id, sequence, persona, locale };
        rows.push(n);
        await insertNarrative(s, insightId, n);
      }
    }
  }
  return ranked(rows, (r) => [r.sequence, r.persona, r.locale, r.id]);
};

/**
 * One fixture's read models, written as the worker would. `prefix` makes the
 * ids of a second organisation distinguishable, since session fixture ids repeat.
 */
export const seedMatch = async (
  t: TestApp,
  orgId: string,
  fixtureId: string,
  prefix = '',
): Promise<SeededMatch> => {
  const s = { t, orgId, fixtureId };
  const insights = BASE_INSIGHTS.map(
    ([id, sequence]) => [`${prefix}${id}`, sequence] as const,
  );
  const overlays = BASE_OVERLAYS.map(([id, sequence, held]) => ({
    id: `${prefix}${id}`,
    sequence,
    held,
    insightId: `${prefix}in_a`,
  }));
  for (const insight of insights) await insertInsight(s, insight);
  const narratives = await seedNarratives(s, insights);
  for (const cue of overlays) await insertOverlay(s, cue);
  for (const [insightId] of insights.slice(0, 3)) {
    for (const n of [1, 2]) await insertRun(s, insightId, n);
  }
  return {
    insightIds: ranked([...insights], (r) => [r[1], r[0]]).map((r) => r[0]),
    narrativeIds: narratives.map((r) => r.id),
    casualNarrativeIds: narratives
      .filter((r) => r.persona === 'CASUAL')
      .map((r) => r.id),
    overlayIds: ranked(
      overlays.filter((c) => !c.held),
      (c) => [c.sequence, c.id],
    ).map((c) => c.id),
  };
};

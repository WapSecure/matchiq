import { and, eq, inArray, sql } from 'drizzle-orm';
import type { Executor } from '../client.js';
import {
  editorialModeOf,
  type EditorialControlRow,
  type EditorialControls,
  type EditorialScope,
  type EditorialView,
  type OverlayEditorialState,
} from '../editorial-types.js';
import type { FixtureKey } from '../ports.js';
import { editorialControls } from '../schema/editorial-tables.js';
import { insights, overlayCues } from '../schema/intelligence-tables.js';

const c = editorialControls;

export const controlColumns = {
  active: c.active,
  reason: c.reason,
  changedBy: c.changedBy,
  changedAt: c.changedAt,
};

export const controlMatch = (
  orgId: string,
  scope: EditorialScope,
  scopeId: string,
) => and(eq(c.orgId, orgId), eq(c.scopeType, scope), eq(c.scopeId, scopeId));

/** The session's freeze row and the organisation's kill-switch row. */
export const readControls = async (
  db: Executor,
  key: FixtureKey,
): Promise<EditorialControls> => {
  const rows = await db
    .select({ scopeType: c.scopeType, ...controlColumns })
    .from(c)
    .where(
      sql`${c.orgId} = ${key.orgId} and ((${c.scopeType} = 'FIXTURE' and ${c.scopeId} = ${key.fixtureId}) or (${c.scopeType} = 'ORG' and ${c.scopeId} = ${key.orgId}))`,
    );
  const pick = (scope: EditorialScope): EditorialControlRow | null => {
    const row = rows.find((r) => r.scopeType === scope);
    return row
      ? {
          active: row.active,
          reason: row.reason,
          changedBy: row.changedBy,
          changedAt: row.changedAt,
        }
      : null;
  };
  return { freeze: pick('FIXTURE'), killSwitch: pick('ORG') };
};

export const readControl = async (
  db: Executor,
  orgId: string,
  scope: EditorialScope,
): Promise<EditorialControlRow | null> => {
  const [row] = await db
    .select(controlColumns)
    .from(c)
    .where(controlMatch(orgId, scope, orgId));
  return row ?? null;
};

interface OverlayStates {
  readonly blocked: Map<string, OverlayEditorialState>;
  readonly aired: Set<string>;
}

const overlayStates = async (
  db: Executor,
  key: FixtureKey,
  overlayIds: readonly string[],
): Promise<OverlayStates> => {
  const states: OverlayStates = { blocked: new Map(), aired: new Set() };
  if (overlayIds.length === 0) return states;
  const rows = await db
    .select({ id: overlayCues.overlayId, state: overlayCues.editorialState })
    .from(overlayCues)
    .where(
      and(
        eq(overlayCues.orgId, key.orgId),
        eq(overlayCues.fixtureId, key.fixtureId),
        inArray(overlayCues.overlayId, [...overlayIds]),
      ),
    );
  for (const row of rows) {
    if (row.state === null) states.aired.add(row.id);
    else states.blocked.set(row.id, row.state);
  }
  return states;
};

const suppressedInsights = async (
  db: Executor,
  key: FixtureKey,
  insightIds: readonly string[],
): Promise<Set<string>> => {
  if (insightIds.length === 0) return new Set();
  const rows = await db
    .select({ id: insights.insightId })
    .from(insights)
    .where(
      and(
        eq(insights.orgId, key.orgId),
        eq(insights.fixtureId, key.fixtureId),
        inArray(insights.insightId, [...insightIds]),
        eq(insights.editorialState, 'SUPPRESSED'),
      ),
    );
  return new Set(rows.map((r) => r.id));
};

/**
 * Read without row locks: the caller holds the fixture lock, which every
 * editorial command also takes, so the view cannot change before commit.
 */
export const readEditorialView = async (
  db: Executor,
  key: FixtureKey,
  ids: { overlayIds: readonly string[]; insightIds: readonly string[] },
): Promise<EditorialView> => {
  const controls = await readControls(db, key);
  const overlays = await overlayStates(db, key, ids.overlayIds);
  return {
    mode: editorialModeOf(controls),
    overlays: overlays.blocked,
    aired: overlays.aired,
    suppressedInsights: await suppressedInsights(db, key, ids.insightIds),
  };
};

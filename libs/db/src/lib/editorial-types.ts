import type {
  AuditEvent,
  AuditEventQuery,
  EditorialMode,
  EditorialStatus,
  OverlayStatus,
} from '@matchiq/contracts';
import type { InsightPublication } from './intelligence-types.js';
import type { FixtureKey, LedgerTransaction } from './ports.js';

export type EditorialScope = 'ORG' | 'FIXTURE';

/** RETRACTED: pulled after airing. HELD: frozen or killed. SUPPRESSED: its insight was suppressed. */
export type OverlayEditorialState = 'RETRACTED' | 'HELD' | 'SUPPRESSED';
export type InsightEditorialState = 'SUPPRESSED';

export interface EditorialControlRow {
  readonly active: boolean;
  readonly reason: string;
  readonly changedBy: string;
  readonly changedAt: Date;
}

export interface EditorialControlWrite {
  readonly orgId: string;
  readonly scope: EditorialScope;
  readonly scopeId: string;
  readonly active: boolean;
  readonly reason: string;
  readonly changedBy: string;
}

export interface EditorialControls {
  readonly freeze: EditorialControlRow | null;
  readonly killSwitch: EditorialControlRow | null;
}

export interface OverlayRow {
  readonly overlayId: string;
  readonly insightId: string | null;
  readonly revision: number;
  readonly status: OverlayStatus;
  readonly editorialState: OverlayEditorialState | null;
}

export interface InsightRow {
  readonly insightId: string;
  readonly publication: InsightPublication;
  readonly status: string;
  readonly editorialState: InsightEditorialState | null;
}

export interface OverlayEditorialWrite {
  readonly status: OverlayStatus;
  readonly state: OverlayEditorialState;
  readonly reason: string;
  readonly endReason?: string;
}

/** Operator commands; every method runs inside the caller's transaction. */
export interface EditorialTransaction extends LedgerTransaction {
  /** Unlocked lookup of the fixture an id belongs to. */
  fixtureOfOverlay(orgId: string, overlayId: string): Promise<string | null>;
  fixtureOfInsight(orgId: string, insightId: string): Promise<string | null>;
  overlayForUpdate(
    key: FixtureKey,
    overlayId: string,
  ): Promise<OverlayRow | null>;
  insightForUpdate(
    key: FixtureKey,
    insightId: string,
  ): Promise<InsightRow | null>;
  overlayOfInsight(
    key: FixtureKey,
    insightId: string,
  ): Promise<OverlayRow | null>;
  liveOverlays(key: FixtureKey): Promise<OverlayRow[]>;
  markOverlay(
    key: FixtureKey,
    overlayId: string,
    write: OverlayEditorialWrite,
  ): Promise<void>;
  suppressInsight(
    key: FixtureKey,
    insightId: string,
    reason: string,
  ): Promise<void>;
  controlForUpdate(
    orgId: string,
    scope: EditorialScope,
    scopeId: string,
  ): Promise<EditorialControlRow | null>;
  saveControl(write: EditorialControlWrite): Promise<EditorialControlRow>;
  controls(key: FixtureKey): Promise<EditorialControls>;
  /** Sessions not yet COMPLETED, in fixture id order (the lock order). */
  activeSessionIds(orgId: string): Promise<string[]>;
}

export interface EditorialUnitOfWork {
  transaction<T>(work: (tx: EditorialTransaction) => Promise<T>): Promise<T>;
}

/** What the worker's publish path needs to apply editorial policy to one batch. */
export interface EditorialView {
  readonly mode: EditorialMode;
  /** Cues already off air for editorial reasons, by overlay id. */
  readonly overlays: ReadonlyMap<string, OverlayEditorialState>;
  /** Cues with a stored row and no editorial state: on air now or aired before. */
  readonly aired: ReadonlySet<string>;
  readonly suppressedInsights: ReadonlySet<string>;
}

export interface AuditPage {
  readonly items: AuditEvent[];
  readonly nextCursor: string | null;
}

export interface AuditReader {
  list(orgId: string, query: AuditEventQuery): Promise<AuditPage>;
}

export interface EditorialReader {
  /** Null when the fixture does not exist. */
  status(key: FixtureKey): Promise<EditorialStatus | null>;
  killSwitch(orgId: string): Promise<EditorialControlRow | null>;
}

export const editorialModeOf = (controls: EditorialControls): EditorialMode => {
  if (controls.killSwitch?.active) return 'KILLED';
  return controls.freeze?.active ? 'FROZEN' : 'AUTO';
};

const controlView = (row: EditorialControlRow | null) => ({
  active: row?.active ?? false,
  changedAt: row?.changedAt.toISOString() ?? null,
});

export const toEditorialStatus = (
  fixtureId: string,
  controls: EditorialControls,
): EditorialStatus => ({
  fixtureId,
  mode: editorialModeOf(controls),
  freeze: controlView(controls.freeze),
  killSwitch: controlView(controls.killSwitch),
});

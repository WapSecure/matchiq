import type {
  AuditEventPage,
  AuditEventQuery,
  EditorialMode,
  EditorialStatus,
  InsightEditorialState,
  InsightPublication,
  OverlayEditorialState,
  OverlayStatus,
  PublishPolicy,
} from '@matchiq/contracts';
import type { FixtureKey } from './ports.js';
import type { ReviewReader, ReviewTransaction } from './review-types.js';

export type EditorialScope = 'ORG' | 'FIXTURE' | 'APPROVAL';

export type {
  InsightEditorialState,
  OverlayEditorialState,
} from '@matchiq/contracts';

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
  /** Active means the session publishes in MANUAL (ADR-0024). */
  readonly approval: EditorialControlRow | null;
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
  readonly reason: string | null;
  readonly endReason?: string;
}

/** Operator commands; every method runs inside the caller's transaction. */
export interface EditorialTransaction extends ReviewTransaction {
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
  readonly publishPolicy: PublishPolicy;
  /** Cues with an editorial state: off air, held or under review for editorial reasons, by overlay id. */
  readonly overlays: ReadonlyMap<string, OverlayEditorialState>;
  /** Cues with a stored row and no editorial state: on air now or aired before. */
  readonly aired: ReadonlySet<string>;
  readonly suppressedInsights: ReadonlySet<string>;
}

export type AuditPage = AuditEventPage;

export interface AuditReader {
  list(orgId: string, query: AuditEventQuery): Promise<AuditPage>;
}

export interface EditorialReader extends ReviewReader {
  /** Null when the fixture does not exist. */
  status(key: FixtureKey): Promise<EditorialStatus | null>;
  killSwitch(orgId: string): Promise<EditorialControlRow | null>;
}

export const editorialModeOf = (controls: EditorialControls): EditorialMode => {
  if (controls.killSwitch?.active) return 'KILLED';
  return controls.freeze?.active ? 'FROZEN' : 'AUTO';
};

export const publishPolicyOf = (controls: EditorialControls): PublishPolicy =>
  controls.approval?.active ? 'MANUAL' : 'AUTO';

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
  publishPolicy: {
    policy: publishPolicyOf(controls),
    changedAt: controls.approval?.changedAt.toISOString() ?? null,
  },
});

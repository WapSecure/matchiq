import {
  AUDIT_ACTIONS,
  type AuditActorType,
  type AuditTargetType,
} from '@matchiq/contracts';

export const ANY = '';

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  [AUDIT_ACTIONS.overlayRetracted]: 'Cue retracted',
  [AUDIT_ACTIONS.overlayHeld]: 'Cue held',
  [AUDIT_ACTIONS.overlayBlocked]: 'Revision blocked',
  [AUDIT_ACTIONS.insightSuppressed]: 'Insight suppressed',
  [AUDIT_ACTIONS.publicationGated]: 'Publication gated',
  [AUDIT_ACTIONS.editorialFrozen]: 'Auto-publish frozen',
  [AUDIT_ACTIONS.editorialResumed]: 'Auto-publish resumed',
  [AUDIT_ACTIONS.killSwitchActivated]: 'Kill switch activated',
  [AUDIT_ACTIONS.killSwitchReleased]: 'Kill switch released',
  [AUDIT_ACTIONS.sessionCreated]: 'Session created',
  [AUDIT_ACTIONS.commandRejected]: 'Replay command rejected',
  [AUDIT_ACTIONS.fixtureCreated]: 'Fixture created',
  [AUDIT_ACTIONS.eventsIngested]: 'Events ingested',
  [AUDIT_ACTIONS.sessionsPurged]: 'Sessions purged',
  [AUDIT_ACTIONS.retentionRun]: 'Retention run',
};

export const ACTOR_TYPE_LABELS: Record<AuditActorType, string> = {
  USER: 'User',
  SERVICE: 'Service',
  OPERATOR: 'Operator',
  SYSTEM: 'System',
  ANONYMOUS: 'Anonymous',
};

export const TARGET_TYPE_LABELS: Record<AuditTargetType, string> = {
  fixture: 'Fixture',
  overlay: 'Cue',
  insight: 'Insight',
  organization: 'Organisation',
  retention: 'Retention',
};

const option = <T extends string>(
  labels: Record<T, string>,
  anyLabel: string,
) => [
  { value: ANY, label: anyLabel },
  ...(Object.entries(labels) as [T, string][]).map(([value, label]) => ({
    value,
    label,
  })),
];

export const AUDIT_FILTER_OPTIONS = {
  action: option(AUDIT_ACTION_LABELS, 'Any action'),
  actorType: option(ACTOR_TYPE_LABELS, 'Any actor'),
  targetType: option(TARGET_TYPE_LABELS, 'Any target'),
  scope: [
    { value: 'fixture', label: 'This session' },
    { value: 'org', label: 'Whole organisation' },
  ],
} as const;

const ACTOR_ID_SHORT = 8;

export const AUDIT_COPY = {
  metaTitle: 'Audit trail',
  eyebrow: 'Editorial governance',
  title: 'Audit trail',
  description:
    'Append-only record of producer actions and automated editorial decisions, newest first.',
  filtersLabel: 'Filter the audit trail',
  fields: {
    action: 'Action',
    actorType: 'Actor',
    targetType: 'Target type',
    targetId: 'Target id',
    scope: 'Scope',
    from: 'From',
    to: 'To',
  },
  targetIdHint: 'Requires a target type.',
  apply: 'Apply filters',
  reset: 'Reset',
  tableCaption: (n: number, more: boolean) =>
    `Audit events: ${n} shown${more ? ', more available' : ''}`,
  columns: {
    time: 'Time',
    action: 'Action',
    actor: 'Actor',
    target: 'Target',
    reason: 'Reason',
    changes: 'Changes',
  },
  /** Under a named actor: the type and a short id; the full id is the hover title. */
  actorDetail: (type: string, id: string) =>
    `${type} · ${id.length > ACTOR_ID_SHORT + 4 ? `${id.slice(0, ACTOR_ID_SHORT)}…` : id}`,
  noReason: 'None recorded',
  noChanges: 'No state change',
  viewChanges: (n: number) => `${n} field${n === 1 ? '' : 's'} changed`,
  diffBefore: 'Before',
  diffAfter: 'After',
  diffField: 'Field',
  diffEmpty: '—',
  loadMore: 'Load more',
  loadingMore: 'Loading…',
  end: 'End of the audit trail.',
  loading: 'Loading the audit trail',
  error: "We couldn't load the activity log",
  empty: 'No audit events match these filters.',
  scrollRegion: 'Audit events table, scrolls horizontally',
} as const;

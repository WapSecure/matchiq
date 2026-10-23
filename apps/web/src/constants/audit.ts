import {
  AUDIT_ACTIONS,
  type AuditActorType,
  type AuditTargetType,
} from '@matchiq/contracts';

export const ANY = '';

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  [AUDIT_ACTIONS.overlayRetracted]: 'Graphic taken off air',
  [AUDIT_ACTIONS.overlayHeld]: 'Graphic held',
  [AUDIT_ACTIONS.overlayBlocked]: 'Graphic update blocked',
  [AUDIT_ACTIONS.insightSuppressed]: 'Key moment dropped',
  [AUDIT_ACTIONS.publicationGated]: 'Fact check blocked wording',
  [AUDIT_ACTIONS.editorialFrozen]: 'Graphics paused',
  [AUDIT_ACTIONS.editorialResumed]: 'Graphics resumed',
  [AUDIT_ACTIONS.killSwitchActivated]: 'Emergency stop on',
  [AUDIT_ACTIONS.killSwitchReleased]: 'Emergency stop released',
  [AUDIT_ACTIONS.sessionCreated]: 'Replay started',
  [AUDIT_ACTIONS.commandRejected]: 'Replay action refused',
  [AUDIT_ACTIONS.fixtureCreated]: 'Match added',
  [AUDIT_ACTIONS.eventsIngested]: 'Match data loaded',
  [AUDIT_ACTIONS.sessionsPurged]: 'Old replays removed',
  [AUDIT_ACTIONS.retentionRun]: 'Scheduled clean-up',
};

export const ACTOR_TYPE_LABELS: Record<AuditActorType, string> = {
  USER: 'Person',
  SERVICE: 'MatchIQ service',
  OPERATOR: 'Platform operator',
  SYSTEM: 'Automatic',
  ANONYMOUS: 'Signed-out visitor',
};

export const TARGET_TYPE_LABELS: Record<AuditTargetType, string> = {
  fixture: 'Match',
  overlay: 'Graphic',
  insight: 'Key moment',
  organization: 'Organisation',
  retention: 'Data clean-up',
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
  actorType: option(ACTOR_TYPE_LABELS, 'Anyone'),
  targetType: option(TARGET_TYPE_LABELS, 'Any item'),
  scope: [
    { value: 'fixture', label: 'This match' },
    { value: 'org', label: 'Whole organisation' },
  ],
} as const;

export const AUDIT_COPY = {
  metaTitle: 'Activity log',
  eyebrow: 'Who did what',
  title: 'Activity log',
  description:
    'Every producer action and automatic on-air decision, newest first. Entries can never be edited or removed.',
  filtersLabel: 'Filter the activity log',
  fields: {
    action: 'Action',
    actorType: 'Who',
    targetType: 'Item type',
    targetId: 'Item ID',
    scope: 'Show',
    from: 'From',
    to: 'To',
  },
  targetIdHint: 'Choose an item type first.',
  apply: 'Apply filters',
  reset: 'Reset',
  tableCaption: (n: number, more: boolean) =>
    `Activity: ${n} shown${more ? ', more available' : ''}`,
  columns: {
    time: 'When',
    action: 'What happened',
    actor: 'Who',
    target: 'Item',
    reason: 'Reason',
    changes: 'Changes',
  },
  technical: {
    action: 'Action key',
    actor: 'Actor id',
    target: 'Item id',
  },
  noReason: 'None given',
  noChanges: 'Nothing changed',
  viewChanges: (n: number) => `${n} field${n === 1 ? '' : 's'} changed`,
  diffBefore: 'Before',
  diffAfter: 'After',
  diffField: 'Field',
  diffEmpty: '—',
  loadMore: 'Load more',
  loadingMore: 'Loading…',
  end: 'End of the activity log.',
  loading: 'Loading the activity log',
  error: "We couldn't load the activity log",
  empty: 'Nothing matches these filters.',
  scrollRegion: 'Activity table, scrolls sideways',
} as const;

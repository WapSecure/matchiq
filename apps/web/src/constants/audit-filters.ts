import { AUDIT_ACTIONS } from '@matchiq/contracts';
import type { DatePresetId } from './ui';

/** Picker copy and grouping for the audit filters; labels stay in `audit.ts`. */
export const AUDIT_FILTER_COPY = {
  when: 'When',
  actionPlaceholder: 'Search actions',
  groups: { editorial: 'Editorial decisions', platform: 'Replays and data' },
  scopeHints: {
    fixture: 'Only this replay.',
    org: 'Every replay in your organisation.',
  },
} as const;

export const AUDIT_ACTION_GROUPS = {
  editorial: [
    AUDIT_ACTIONS.overlayRetracted,
    AUDIT_ACTIONS.overlayHeld,
    AUDIT_ACTIONS.overlayBlocked,
    AUDIT_ACTIONS.insightSuppressed,
    AUDIT_ACTIONS.insightRetracted,
    AUDIT_ACTIONS.publicationGated,
    AUDIT_ACTIONS.editorialFrozen,
    AUDIT_ACTIONS.editorialResumed,
    AUDIT_ACTIONS.killSwitchActivated,
    AUDIT_ACTIONS.killSwitchReleased,
  ],
  platform: [
    AUDIT_ACTIONS.sessionCreated,
    AUDIT_ACTIONS.commandRejected,
    AUDIT_ACTIONS.fixtureCreated,
    AUDIT_ACTIONS.eventsIngested,
    AUDIT_ACTIONS.sessionsPurged,
    AUDIT_ACTIONS.retentionRun,
  ],
} as const;

export const AUDIT_DATE_PRESETS: readonly DatePresetId[] = [
  'last15m',
  'lastHour',
  'today',
  'thisMatch',
];

/** React Aria keys cannot be empty, so "any" travels as this key. */
export const ANY_KEY = 'any';

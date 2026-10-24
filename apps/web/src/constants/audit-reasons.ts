/** Plain producer wording for every reason the worker and API record. Keys are the raw stored values. */
export const AUDIT_REASON_LABELS: Readonly<Record<string, string>> = {
  EDITORIAL_FREEZE: 'Graphics were paused',
  KILL_SWITCH: 'Emergency stop was on',
  INSIGHT_SUPPRESSED: 'A producer dropped this key moment',
  CUE_OFF_AIR: 'The graphic was already off air',
  AWAITING_APPROVAL: "Waiting for a producer's OK",
  APPROVED_COPY_LOCKED: 'Already approved, so the wording is locked',
  MANUAL_REVISION_WITHHELD:
    'New wording held back until a producer approves it',
  APPROVAL_WINDOW_LAPSED: 'Not sent to air in time',
  expired: 'Finished on the match clock',
  'period ended': 'The period ended',
  'match ended': 'The match ended',
  'superseded by a higher-priority cue': 'Replaced by a more important graphic',
  'stale: not shown before the queue wait limit':
    'Waited too long to go to air',
  'dropped: overlay queue full': 'Too many graphics were waiting',
  'retracted: the moment was ruled out by a correction':
    'The moment was ruled out by a correction',
  'a late event changed the match record':
    'A late event changed the match record',
  'retracted by producer': 'Taken off air by a producer',
  'insight suppressed by producer': 'A producer dropped this key moment',
  'editorial kill switch activated': 'Emergency stop was switched on',
};

export const REASON_COPY = {
  none: 'No reason recorded',
} as const;

/** Matches stored codes such as APPROVAL_WINDOW_LAPSED anywhere in a string. */
export const REASON_CODE_PATTERN = /\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/g;
export const REASON_SEPARATORS = /[_.-]+/g;

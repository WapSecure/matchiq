import type { EditorialMode, OverlayRetractCause } from '@matchiq/contracts';
import type { ErrorKind } from './errors';

export type ModeTone = 'positive' | 'warning' | 'critical';

/** How each editorial mode reads in the header chip, banner and preview. */
export const MODE_VIEW: Record<
  EditorialMode,
  { label: string; tone: ModeTone; standby: string | null }
> = {
  AUTO: { label: 'Auto graphics', tone: 'positive', standby: null },
  FROZEN: {
    label: 'Graphics paused',
    tone: 'warning',
    standby: 'Held: graphics paused',
  },
  KILLED: {
    label: 'Emergency stop',
    tone: 'critical',
    standby: 'Held: emergency stop',
  },
};

/** Typed confirmation for the organisation-wide emergency stop. */
export const KILL_CONFIRM_PHRASE = 'STOP';

export const NOTICE_DISMISS_MS = 7_000;

/** `overlay.retract` reason the API sends for a producer retraction. */
export const PRODUCER_RETRACT_REASON = 'retracted by producer';

export const EDITORIAL_CAUSES: ReadonlySet<OverlayRetractCause> = new Set([
  'PRODUCER',
  'INSIGHT_SUPPRESSED',
  'KILL_SWITCH',
]);

export const CAUSE_LABELS: Record<OverlayRetractCause, string> = {
  EXPIRED: 'Finished',
  SUPERSEDED: 'Replaced',
  PERIOD_ENDED: 'End of the half',
  MATCH_ENDED: 'Full time',
  PRODUCER: 'Taken off air by a producer',
  INSIGHT_SUPPRESSED: 'Key moment dropped',
  KILL_SWITCH: 'Emergency stop',
  CORRECTION: 'Ruled out by a correction',
};

type CommandCopy = {
  action: string;
  title: string;
  description: string;
  submit: string;
  pending: string;
  done: string;
  noop: string;
};

export const FREEZE_COPY: CommandCopy = {
  action: 'Pause graphics',
  title: 'Pause new graphics for this match',
  description:
    "New graphics for this match are held and won't go on air. The graphic on air now runs its course unless you take it off air. Written key moments still appear.",
  submit: 'Pause',
  pending: 'Pausing…',
  done: 'Graphics paused. New graphics are held.',
  noop: 'Graphics were already paused. Nothing changed.',
};

export const RESUME_COPY: CommandCopy = {
  action: 'Resume graphics',
  title: 'Resume automatic graphics for this match',
  description:
    'New fact-checked graphics go on air again. Graphics held while paused stay held.',
  submit: 'Resume',
  pending: 'Resuming…',
  done: 'Graphics resumed.',
  noop: 'Graphics were already running. Nothing changed.',
};

export const KILL_COPY: CommandCopy & {
  phrase: string;
  next: string;
  back: string;
  confirmTitle: string;
  confirmBody: string;
  confirmLabel: string;
  confirmHint: string;
  mismatch: string;
  reasonSummary: string;
} = {
  action: 'Emergency stop',
  title: 'Emergency stop for your whole organisation',
  description:
    'Takes every graphic off air in every live match in your organisation, and holds all new graphics until someone releases the stop.',
  submit: 'Stop all graphics',
  pending: 'Stopping…',
  done: 'Emergency stop on. All graphics were taken off air.',
  noop: 'The emergency stop was already on. Nothing changed.',
  phrase: KILL_CONFIRM_PHRASE,
  next: 'Continue',
  back: 'Back',
  confirmTitle: 'Confirm the emergency stop',
  confirmBody:
    'This affects every live match in your organisation, not just this one.',
  confirmLabel: 'Confirmation',
  confirmHint: `Type ${KILL_CONFIRM_PHRASE} in capitals to confirm.`,
  mismatch: `Type ${KILL_CONFIRM_PHRASE} exactly to confirm.`,
  reasonSummary: 'Reason',
};

export const RELEASE_COPY: CommandCopy = {
  action: 'Release emergency stop',
  title: 'Release the emergency stop',
  description:
    "New graphics go on air again in every match that isn't paused. Graphics held during the stop stay held.",
  submit: 'Release',
  pending: 'Releasing…',
  done: 'Emergency stop released.',
  noop: 'The emergency stop was already off. Nothing changed.',
};

export const RETRACT_COPY: CommandCopy & {
  label: (h: string) => string;
  idle: string;
} = {
  action: 'Take off air',
  idle: 'Nothing on air to take off',
  label: (headline) => `Take off air: ${headline}`,
  title: 'Take this graphic off air',
  description:
    'The graphic leaves the screen at once and never comes back, including later updates.',
  submit: 'Take off air',
  pending: 'Taking off air…',
  done: 'Graphic taken off air.',
  noop: 'That graphic was already off air. Nothing changed.',
};

export const SUPPRESS_COPY: CommandCopy & { label: (h: string) => string } = {
  action: 'Drop',
  label: (headline) => `Drop key moment: ${headline}`,
  title: 'Drop this key moment',
  description:
    'Its write-ups never appear, and its graphic comes off air if it is showing.',
  submit: 'Drop key moment',
  pending: 'Dropping…',
  done: 'Key moment dropped.',
  noop: 'That key moment was already dropped. Nothing changed.',
};

export const EDITORIAL_COPY = {
  barTitle: 'Producer controls',
  barDescription:
    'Override what goes on air. Every action is saved to the activity log with your reason.',
  modeLegend: 'Mode',
  chipPrefix: 'Producer mode: ',
  auditLink: 'Activity log',
  cancel: 'Cancel',
  noticeRegion: 'Producer notifications',
  dismiss: 'Dismiss notification',
  subject: 'Graphic',
  reason: {
    label: 'Reason',
    hint: (min: number, max: number) =>
      `Saved to the activity log and never shown to viewers. ${min} to ${max} characters.`,
    tooShort: (min: number) => `Enter a reason of at least ${min} characters.`,
    tooLong: (max: number) => `Keep the reason to ${max} characters or fewer.`,
    count: (n: number, max: number) => `${n} / ${max}`,
  },
  banner: {
    FROZEN: {
      title: 'Graphics paused',
      body: "New graphics for this match are held and won't go on air. Written key moments still appear. Resuming doesn't release anything that was held.",
    },
    KILLED: {
      title: 'Emergency stop on',
      body: 'All graphics across your organisation are held, and live ones were taken off air. A producer must release the emergency stop before graphics go on air again.',
    },
  },
  marks: {
    suppressed: 'Dropped',
    retracted: 'Taken off air',
    held: {
      EDITORIAL_FREEZE: 'Held: graphics paused',
      KILL_SWITCH: 'Held: emergency stop',
    } as Record<string, string>,
    heldFallback: 'Held',
  },
} as const;

/** Gallery wording for failed producer commands, by humanized error kind. */
export const EDITORIAL_PROBLEMS = {
  byKind: {
    sessionExpired:
      "You've been signed out for security. Sign in again as a producer, then retry. Nothing was changed.",
    forbidden:
      "Your role can't do this. Ask a producer to make the change. Nothing was changed.",
    notFound: "It no longer exists, so there's nothing to change.",
    unexpected: "That didn't go through. Nothing was changed.",
  } as Partial<Record<ErrorKind, string>>,
  nothingChanged: 'Nothing was changed.',
} as const;

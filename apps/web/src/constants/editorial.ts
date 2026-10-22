import type { EditorialMode, OverlayRetractCause } from '@matchiq/contracts';

export type ModeTone = 'positive' | 'warning' | 'critical';

/** How each editorial mode reads in the header chip, banner and preview. */
export const MODE_VIEW: Record<
  EditorialMode,
  { label: string; tone: ModeTone; standby: string | null }
> = {
  AUTO: { label: 'Auto-publish', tone: 'positive', standby: null },
  FROZEN: {
    label: 'Frozen',
    tone: 'warning',
    standby: 'Held by editorial freeze',
  },
  KILLED: {
    label: 'Kill switch',
    tone: 'critical',
    standby: 'Kill switch active',
  },
};

/** Typed confirmation for the organisation kill switch. */
export const KILL_CONFIRM_PHRASE = 'KILL';

export const NOTICE_DISMISS_MS = 7_000;

/** `overlay.retract` reason the API sends for a producer retraction. */
export const PRODUCER_RETRACT_REASON = 'retracted by producer';

export const EDITORIAL_CAUSES: ReadonlySet<OverlayRetractCause> = new Set([
  'PRODUCER',
  'INSIGHT_SUPPRESSED',
  'KILL_SWITCH',
]);

export const CAUSE_LABELS: Record<OverlayRetractCause, string> = {
  EXPIRED: 'Expired',
  SUPERSEDED: 'Superseded',
  PERIOD_ENDED: 'Period ended',
  MATCH_ENDED: 'Match ended',
  PRODUCER: 'Retracted by producer',
  INSIGHT_SUPPRESSED: 'Insight suppressed',
  KILL_SWITCH: 'Kill switch',
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
  action: 'Freeze auto-publish',
  title: 'Freeze auto-publish for this session',
  description:
    'New cues for this session are held and never air. The cue on air runs out unless you retract it. Narratives still publish.',
  submit: 'Freeze',
  pending: 'Freezing…',
  done: 'Auto-publish frozen. New cues are held.',
  noop: 'Auto-publish was already frozen. Nothing changed.',
};

export const RESUME_COPY: CommandCopy = {
  action: 'Resume auto-publish',
  title: 'Resume auto-publish for this session',
  description:
    'New verified cues publish again. Cues held while frozen stay held and never air.',
  submit: 'Resume',
  pending: 'Resuming…',
  done: 'Auto-publish resumed.',
  noop: 'Auto-publish was already running. Nothing changed.',
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
  action: 'Kill switch',
  title: 'Activate the organisation kill switch',
  description:
    'Takes every live cue off air in every active session of your organisation, and holds all new cues until it is released.',
  submit: 'Activate kill switch',
  pending: 'Activating…',
  done: 'Kill switch active. Live cues were taken off air.',
  noop: 'The kill switch was already active. Nothing changed.',
  phrase: KILL_CONFIRM_PHRASE,
  next: 'Continue',
  back: 'Back',
  confirmTitle: 'Confirm the kill switch',
  confirmBody:
    'This affects every active session in the organisation, not only this one.',
  confirmLabel: 'Confirmation',
  confirmHint: `Type ${KILL_CONFIRM_PHRASE} in capitals to confirm.`,
  mismatch: `Type ${KILL_CONFIRM_PHRASE} exactly to confirm.`,
  reasonSummary: 'Reason',
};

export const RELEASE_COPY: CommandCopy = {
  action: 'Release kill switch',
  title: 'Release the organisation kill switch',
  description:
    'New cues publish again in every session that is not frozen. Nothing that was held is released.',
  submit: 'Release',
  pending: 'Releasing…',
  done: 'Kill switch released.',
  noop: 'The kill switch was already released. Nothing changed.',
};

export const RETRACT_COPY: CommandCopy & {
  label: (h: string) => string;
  idle: string;
} = {
  action: 'Retract',
  idle: 'Retract: no cue on air',
  label: (headline) => `Retract on-air cue: ${headline}`,
  title: 'Retract the on-air cue',
  description:
    'The cue leaves air at once and never airs again, including later agent revisions.',
  submit: 'Retract cue',
  pending: 'Retracting…',
  done: 'Cue retracted.',
  noop: 'The cue was already retracted. Nothing changed.',
};

export const SUPPRESS_COPY: CommandCopy & { label: (h: string) => string } = {
  action: 'Suppress',
  label: (headline) => `Suppress insight: ${headline}`,
  title: 'Suppress this insight',
  description:
    'Its pending narratives are never published, and its cue is taken off air if it is live.',
  submit: 'Suppress insight',
  pending: 'Suppressing…',
  done: 'Insight suppressed.',
  noop: 'The insight was already suppressed. Nothing changed.',
};

export const EDITORIAL_COPY = {
  barTitle: 'Editorial control',
  barDescription: 'Producer overrides. Every action is recorded with a reason.',
  modeLegend: 'Publishing',
  chipPrefix: 'Editorial ',
  auditLink: 'Audit trail',
  cancel: 'Cancel',
  noticeRegion: 'Editorial notifications',
  dismiss: 'Dismiss notification',
  subject: 'Cue',
  reason: {
    label: 'Reason',
    hint: (min: number, max: number) =>
      `Recorded in the audit trail and never shown to viewers. ${min} to ${max} characters.`,
    tooShort: (min: number) => `Enter a reason of at least ${min} characters.`,
    tooLong: (max: number) => `Keep the reason to ${max} characters or fewer.`,
    count: (n: number, max: number) => `${n} / ${max}`,
  },
  banner: {
    FROZEN: {
      title: 'Auto-publish frozen',
      body: 'New cues for this session are held and will not air. Narratives still publish. Resuming releases nothing that was held.',
    },
    KILLED: {
      title: 'Kill switch active',
      body: 'Every cue in the organisation is held and live cues were taken off air. A producer must release the kill switch before cues air again.',
    },
  },
  marks: {
    suppressed: 'Suppressed',
    retracted: 'Cue retracted',
    held: {
      EDITORIAL_FREEZE: 'Cue held: freeze',
      KILL_SWITCH: 'Cue held: kill switch',
    } as Record<string, string>,
    heldFallback: 'Cue held',
  },
} as const;

/** Readable copy for RFC 9457 problems, by `type` slug first, then status. */
export const EDITORIAL_PROBLEMS = {
  bySlug: {
    'overlay-not-on-air':
      'That cue is no longer on air, so there is nothing to retract.',
    'insight-already-published':
      'This insight is already published. Retract its cue from the overlay preview instead.',
    'idempotency-key-reused':
      'This request clashed with an earlier attempt. Close the dialog and try again.',
  } as Record<string, string>,
  byStatus: {
    401: 'Your session has ended or you are not signed in. Sign in as a producer to use editorial controls.',
    403: 'Your role does not allow this action. Ask a producer to make the change.',
    404: 'It no longer exists. It may have been removed with its session.',
    429: 'Too many requests. Wait a moment, then try again.',
  } as Record<number, string>,
  fallback: 'The command failed. Nothing was changed.',
  reference: (id: string) => `Reference ${id}`,
} as const;

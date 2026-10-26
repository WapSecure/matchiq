import type { PublishPolicy } from '@matchiq/contracts';

/** Producer approve-before-air copy (ADR-0024), in plain producer language. */
export const APPROVAL_COPY = {
  title: 'Waiting for your OK',
  description:
    'In Manual, each fact-checked graphic waits here until you send it to air.',
  count: (n: number) => (n === 1 ? '1 waiting' : `${n} waiting`),
  loading: 'Checking for graphics waiting for your OK',
  empty: {
    MANUAL: {
      title: 'Nothing waiting',
      body: 'New graphics appear here before they go on air.',
    },
    AUTO: {
      title: 'Graphics go on air automatically',
      body: 'Switch to Manual to check each graphic before it airs.',
    },
  },
  loadError: "We couldn't load the graphics waiting for your OK.",
  approve: 'Send to air',
  approving: 'Sending…',
  reject: "Don't air",
  rejecting: 'Dropping…',
  approveLabel: (headline: string) => `Send to air: ${headline}`,
  rejectLabel: (headline: string) => `Don't air: ${headline}`,
  sendWithin: (seconds: number) => `Send within ${seconds} s`,
  urgentSeconds: 10,
  updated: 'Updated wording',
  previewLabel: (headline: string) => `Preview: ${headline}`,
  done: {
    APPROVED: 'Sent to air.',
    REJECTED: "Graphic dropped. It won't air.",
  },
  noop: 'That graphic was already decided. Nothing changed.',
  durationLegend: 'Time on screen',
  priorityLegend: 'Priority',
} as const;

/** `0` keeps the graphic's normal time on screen. */
export const DURATION_OPTIONS = [
  { value: 0, label: 'Normal time' },
  { value: 4_000, label: '4 seconds', short: '4s' },
  { value: 6_000, label: '6 seconds', short: '6s' },
  { value: 8_000, label: '8 seconds', short: '8s' },
] as const;

export type DurationChoice = (typeof DURATION_OPTIONS)[number]['value'];

export const PRIORITY_OPTIONS = [
  { value: 'suggested', label: 'As suggested' },
  { value: 'high', label: 'High' },
  { value: 'top', label: 'Top' },
] as const;

export type PriorityChoice = (typeof PRIORITY_OPTIONS)[number]['value'];

export const PRIORITY_VALUES: Record<
  Exclude<PriorityChoice, 'suggested'>,
  number
> = { high: 90, top: 100 };

/** Copy-fit against the overlay limits; above this share of a limit reads as tight. */
export const COPY_FIT = {
  tightRatio: 0.9,
  labels: { fits: 'Fits', tight: 'Tight fit', over: 'Too long' },
  headline: 'Headline',
  body: 'Body',
  count: (n: number, max: number) => `${n} of ${max} characters`,
} as const;

type PolicyCommandCopy = {
  action: string;
  title: string;
  description: string;
  submit: string;
  pending: string;
  done: string;
  noop: string;
};

export const POLICY_COPY: {
  legend: string;
  short: string;
  options: readonly { value: PublishPolicy; label: string }[];
  readOnly: Record<PublishPolicy, string>;
  to: Record<PublishPolicy, PolicyCommandCopy>;
} = {
  legend: 'Graphics go on air',
  short: 'Approval',
  options: [
    { value: 'AUTO', label: 'Auto' },
    { value: 'MANUAL', label: 'Manual' },
  ],
  readOnly: { AUTO: 'No approval needed', MANUAL: 'Producer approval on' },
  to: {
    MANUAL: {
      action: 'Switch to Manual',
      title: 'Check each graphic before it airs',
      description:
        "Fact-checked graphics wait for your OK instead of going on air. A graphic you don't send within its countdown is dropped and never airs late.",
      submit: 'Switch to Manual',
      pending: 'Switching…',
      done: 'Manual on. Graphics wait for your OK.',
      noop: 'Graphics were already manual. Nothing changed.',
    },
    AUTO: {
      action: 'Switch to Auto',
      title: 'Send graphics to air automatically',
      description:
        'Fact-checked graphics go on air as soon as they are ready. Any graphic already waiting still needs your OK.',
      submit: 'Switch to Auto',
      pending: 'Switching…',
      done: 'Auto on. Graphics go on air when ready.',
      noop: 'Graphics were already automatic. Nothing changed.',
    },
  },
};

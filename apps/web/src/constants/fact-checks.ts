const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`;

const listOf = (items: readonly string[]): string =>
  items.length < 2
    ? (items[0] ?? '')
    : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;

export type MomentFilter = 'ALL' | 'AGENT' | 'TEMPLATE' | 'SIMULATED';

/** Why standard wording was used, grouped so a page-level note can count them. */
export type FallbackGroup =
  'AI_TROUBLE' | 'AI_OFF' | 'FACT_CHECK' | 'HELD' | 'OTHER';

export const FACT_CHECKS_COPY = {
  share: {
    title: 'Auto-written',
    of: (ai: number, total: number) =>
      `${ai} of ${plural(total, 'key moment')}`,
    percent: (pct: number) => `${pct}%`,
    barLabel: (ai: number, standard: number, pending: number) =>
      `${ai} auto-written, ${standard} in standard wording, ${pending} still being written`,
    legend: {
      AGENT: 'Auto-written',
      TEMPLATE: 'Standard wording',
      PENDING: 'Still being written',
    },
  },
  tiles: {
    caught: 'Caught by the fact check',
    caughtHint: 'Wrong facts or numbers stopped before anything went on air',
    heldBack: (n: number) =>
      `${n} more held back for wording that repeated itself, not for facts`,
    simulated: 'Simulated failures',
    simulatedHint: 'Failures we caused on purpose to show the safety net',
    providers: 'Who wrote them',
  },
  fallbackNote: {
    title: 'Why standard wording was used',
    line: (n: number, because: string) =>
      `${plural(n, 'moment')} used standard wording because ${because}.`,
  },
  moreLabel: 'More key moments',
  filters: {
    legend: 'Show',
    option: (label: string, n: number) => `${label} (${n})`,
    labels: {
      ALL: 'All',
      AGENT: 'Auto-written',
      TEMPLATE: 'Standard wording',
      SIMULATED: 'Simulated failures',
    } satisfies Record<MomentFilter, string>,
    empty: 'No key moments match this filter.',
    showAll: 'Show all',
  },
  timeline: {
    label: 'Key moments by minute',
    marker: (kind: string, minute: string, source: string) =>
      `${kind}, ${minute}: ${source}`,
    ticks: [
      { minute: 0, label: "0'" },
      { minute: 15, label: "15'" },
      { minute: 30, label: "30'" },
      { minute: 45, label: 'HT' },
      { minute: 60, label: "60'" },
      { minute: 75, label: "75'" },
      { minute: 90, label: 'FT' },
    ],
  },
  facts: {
    label: (kind: string, minute: string) => `${kind} at ${minute}`,
    commentary: 'Commentary',
    graphic: 'Graphic',
    check: 'Fact check',
    reach: 'Ready in',
    written: {
      AGENT: 'Auto-written',
      TEMPLATE: 'Standard wording',
      PENDING: 'Being written…',
    },
    graphicValue: {
      aiWording: 'Auto-written',
      standard: 'Standard wording',
      pending: 'Not made yet',
      RETRACTED: 'Taken off air by a producer',
      HELD: 'Held by a producer',
      SUPPRESSED: 'Dropped by a producer',
      AWAITING_APPROVAL: "Waiting for a producer's OK",
      APPROVED: 'Sent to air by a producer',
      REJECTED: 'Kept off air by a producer',
      APPROVAL_EXPIRED: 'Not sent in time',
    },
    checkValue: {
      passed: 'Passed ✓',
      pending: 'Pending',
      caught: (n: number) => `Caught ${plural(n, 'problem')}`,
    },
    reachValue: (languages: number, audiences: number) =>
      `${plural(languages, 'language')} for ${plural(audiences, 'audience')}`,
    writeUps: (n: number) => plural(n, 'write-up'),
    reachTip: (languages: readonly string[], audiences: readonly string[]) =>
      `${listOf(languages)}, for ${listOf(audiences)}.`,
    why: 'Why standard wording',
    badge: {
      AGENT: 'Auto-written',
      TEMPLATE: 'Standard wording',
      PENDING: 'Being written',
    },
  },
  technical: {
    runsHint: 'Every step, in the order it ran',
  },
} as const;

export const FALLBACK_GROUP_BECAUSE: Record<FallbackGroup, string> = {
  AI_TROUBLE: 'the writing service was slow or unavailable',
  AI_OFF: 'AI writing is switched off here',
  FACT_CHECK: 'the fact check rejected the draft',
  HELD: 'they did not pass our checks',
  OTHER: 'it was the safer choice',
};

export const FILTER_ORDER: readonly MomentFilter[] = [
  'ALL',
  'AGENT',
  'TEMPLATE',
  'SIMULATED',
];

/** Minutes the strip spans at least: regulation time. */
export const TIMELINE_MIN_SPAN = 90;

/** Key moments shown per step before "Show more". */
export const MOMENTS_PAGE_SIZE = 10;
export const PERCENT = 100;

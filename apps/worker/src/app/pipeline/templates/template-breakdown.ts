import {
  CONTEXT_REFS,
  LIMITS,
  type AnalystBreakdown,
  type BreakdownPart,
  type CitedValue,
  type ContextSide,
  type Fixture,
  type Insight,
  type InsightKind,
  type Locale,
  type MomentContext,
} from '@matchiq/contracts';
import { BREAKDOWN_EN } from './breakdown-copy-en';
import { BREAKDOWN_ES } from './breakdown-copy-es';
import { BREAKDOWN_FR } from './breakdown-copy-fr';
import { BREAKDOWN_PCM } from './breakdown-copy-pcm';
import type { BreakdownCopy } from './breakdown-copy-types';
import { COPY_EN } from './copy-en';
import { COPY_ES } from './copy-es';
import { COPY_FR } from './copy-fr';
import { COPY_PCM } from './copy-pcm';
import type { LocaleCopy } from './copy-types';
import { buildFacts, formatNumber } from './template-facts';

const COPY: Readonly<Record<Locale, readonly [LocaleCopy, BreakdownCopy]>> = {
  'en-GB': [COPY_EN, BREAKDOWN_EN],
  'fr-FR': [COPY_FR, BREAKDOWN_FR],
  'es-ES': [COPY_ES, BREAKDOWN_ES],
  'pcm-NG': [COPY_PCM, BREAKDOWN_PCM],
};

/** A rising subject is never described as falling (MQ-060 editorial rules). */
const FALLING_ALLOWED: ReadonlySet<InsightKind> = new Set([
  'GOAL',
  'RED_CARD',
  'PLAYER_MILESTONE',
]);

interface Sentence {
  readonly text: string;
  readonly cited: readonly CitedValue[];
}

interface Words {
  readonly locale: Locale;
  readonly copy: BreakdownCopy;
  readonly context: MomentContext;
  readonly team: string;
  readonly opponent: string;
  readonly kind: InsightKind;
}

const cite = (context: MomentContext, ref: string): CitedValue[] => {
  const value = context.metrics[ref];
  return value === undefined ? [] : [{ metricRef: ref, value }];
};

const fmt = (w: Words, ref: string): string =>
  formatNumber(w.context.metrics[ref] ?? 0, w.locale);

const has = (w: Words, ...refs: string[]) =>
  refs.every((ref) => w.context.metrics[ref] !== undefined);

/** Keeps the first sentence and as many of the rest as fit the part limit. */
const partOf = (
  sentences: readonly Sentence[],
  eventIds: readonly string[],
): BreakdownPart => {
  const kept: Sentence[] = [];
  for (const sentence of sentences) {
    const text = [...kept, sentence].map((s) => s.text).join(' ');
    if (kept.length > 0 && text.length > LIMITS.breakdownPartMax) break;
    kept.push(sentence);
  }
  const cited = new Map(
    kept.flatMap((s) => s.cited).map((c) => [c.metricRef, c] as const),
  );
  return {
    text: kept.map((s) => s.text).join(' '),
    citedValues: [...cited.values()],
    evidenceEventIds: [...new Set(eventIds)],
  };
};

const scoreSentence = (w: Words): Sentence => {
  const { margin, minute } = CONTEXT_REFS;
  const value = w.context.metrics[margin] ?? 0;
  const clause = w.copy.score[w.context.scoreState](
    w.team,
    value,
    fmt(w, margin),
    fmt(w, minute),
  );
  return {
    text: `${clause}${w.copy.phase[w.context.phase]}.`,
    cited: [
      ...(w.context.scoreState === 'LEVEL' ? [] : cite(w.context, margin)),
      ...cite(w.context, minute),
    ],
  };
};

const label = (w: Words, metric: keyof BreakdownCopy['labels'], n: number) =>
  w.copy.labels[metric][n === 1 ? 0 : 1];

const comparisonSentence = (w: Words): Sentence[] => {
  const metric = w.context.comparison?.metric;
  const side: ContextSide = w.context.side;
  const opp: ContextSide = side === 'home' ? 'away' : 'home';
  const refs = [
    CONTEXT_REFS.windowMinutes,
    CONTEXT_REFS.recent(side),
    CONTEXT_REFS.average(side),
    CONTEXT_REFS.recent(opp),
  ];
  if (metric === undefined || !has(w, ...refs)) return [];
  const recent = w.context.metrics[CONTEXT_REFS.recent(side)] ?? 0;
  const text = w.copy.comparison({
    team: w.team,
    window: fmt(w, CONTEXT_REFS.windowMinutes),
    recent: fmt(w, CONTEXT_REFS.recent(side)),
    label: label(w, metric, recent),
    average: fmt(w, CONTEXT_REFS.average(side)),
    opponent: { name: w.opponent, recent: fmt(w, CONTEXT_REFS.recent(opp)) },
  });
  return [{ text, cited: refs.flatMap((ref) => cite(w.context, ref)) }];
};

const trendSentence = (w: Words): Sentence[] => {
  const trend = w.context.trend;
  const [a, b, c] = CONTEXT_REFS.spells;
  if (trend === null || !has(w, a, b, c)) return [];
  const falling = trend.direction === 'FALLING' && FALLING_ALLOWED.has(w.kind);
  if (trend.direction !== 'RISING' && !falling) return [];
  const phrase = falling ? w.copy.falling : w.copy.rising;
  const text = phrase(w.copy.labels[trend.metric][1], [
    fmt(w, a),
    fmt(w, b),
    fmt(w, c),
  ]);
  return [{ text, cited: [a, b, c].flatMap((ref) => cite(w.context, ref)) }];
};

const previousSentence = (w: Words): Sentence[] => {
  const ref = CONTEXT_REFS.previousMinute;
  if (!has(w, ref)) return [];
  const phrase = w.kind === 'GOAL' ? w.copy.previousGoal : w.copy.previousSpell;
  return [{ text: phrase(w.team, fmt(w, ref)), cited: cite(w.context, ref) }];
};

const regainSentence = (w: Words): Sentence[] => {
  const ref = CONTEXT_REFS.regainSeconds;
  if (w.kind !== 'GOAL' || !has(w, ref)) return [];
  return [
    { text: w.copy.regain(w.team, fmt(w, ref)), cited: cite(w.context, ref) },
  ];
};

/**
 * The deterministic three-part Analyst breakdown (MQ-068) from the envelope
 * and the moment's engine context. Every number is a cited engine value;
 * without context the parts still read, just without the comparison.
 */
export const templateBreakdown = (
  insight: Insight,
  fixture: Fixture,
  locale: Locale,
): AnalystBreakdown => {
  const [copy, words] = COPY[locale];
  const { facts, cited } = buildFacts(
    insight,
    fixture,
    locale,
    copy.confidence,
  );
  const lead = facts.complete
    ? copy.casual[facts.kind](facts)
    : copy.generic.body(facts);
  const events = insight.evidence.eventIds;
  const subject =
    facts.kind === 'PLAYER_MILESTONE'
      ? (facts.player ?? facts.team)
      : facts.team;
  const context = insight.context;
  const watch =
    facts.kind === 'GOAL' && context !== undefined
      ? words.watchGoal[context.scoreState](subject)
      : words.watch[facts.kind](subject);
  const whatToWatch = partOf([{ text: watch, cited: [] }], events);
  if (context === undefined) {
    return {
      whatHappened: partOf([{ text: lead, cited }], events),
      whyItMatters: partOf(
        [{ text: words.noContext(subject), cited: [] }],
        events,
      ),
      whatToWatch,
    };
  }
  const w: Words = {
    locale,
    copy: words,
    context,
    team: facts.team,
    opponent: facts.opponent,
    kind: facts.kind,
  };
  const regain = regainSentence(w);
  return {
    whatHappened: partOf(
      [{ text: lead, cited }, ...regain],
      regain.length > 0 ? [...events, ...context.eventIds] : events,
    ),
    whyItMatters: partOf(
      [
        scoreSentence(w),
        ...comparisonSentence(w),
        ...trendSentence(w),
        ...previousSentence(w),
      ],
      events,
    ),
    whatToWatch,
  };
};

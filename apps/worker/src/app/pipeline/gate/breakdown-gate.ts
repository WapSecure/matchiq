import type {
  AnalystBreakdown,
  BreakdownPart,
  EntityAllowlist,
  Insight,
  Locale,
  NarrativeDraft,
} from '@matchiq/contracts';
import { verifyCitedValues } from '@matchiq/football-engine';
import { GATE_DETAILS } from '../../constants';
import { guardIssues, type GuardIssue } from './guard-checks';
import {
  allowedNameTokens,
  unknownCapitalised,
  unsupportedNumerals,
} from './text-checks';

const PARTS = ['whatHappened', 'whyItMatters', 'whatToWatch'] as const;

/** Evidence metrics plus the moment's engine context (MQ-068); both are citable. */
export const citableMetrics = (insight: Insight): Record<string, number> => ({
  ...insight.evidence.computedMetrics,
  ...(insight.context?.metrics ?? {}),
});

const citableEvents = (insight: Insight): ReadonlySet<string> =>
  new Set([
    ...insight.evidence.eventIds,
    ...insight.evidence.counterEvidence.flatMap((c) => c.eventIds),
    ...(insight.context?.eventIds ?? []),
  ]);

interface PartInput {
  readonly insight: Insight;
  readonly entities: EntityAllowlist;
  readonly locale: Locale;
}

const partIssues = (part: BreakdownPart, input: PartInput): GuardIssue[] => {
  const supported = part.citedValues.map((c) => c.value);
  const events = citableEvents(input.insight);
  const allowed = allowedNameTokens(input.entities);
  const cited = verifyCitedValues(
    { computedMetrics: citableMetrics(input.insight) },
    part.citedValues,
  ).map((i): GuardIssue => ({
    code: 'UNSUPPORTED_NUMBER',
    detail: GATE_DETAILS.citedValue(i.metricRef, i.reason),
  }));
  const unknownEvents = part.evidenceEventIds.filter((id) => !events.has(id));
  return [
    ...cited,
    ...(unknownEvents.length === 0
      ? []
      : [
          {
            code: 'UNCITED_EVIDENCE' as const,
            detail: GATE_DETAILS.evidence(unknownEvents.join(', ')),
          },
        ]),
    ...unsupportedNumerals(part.text, input.locale, supported).map(
      (raw): GuardIssue => ({
        code: 'UNSUPPORTED_NUMBER',
        detail: GATE_DETAILS.textNumber(raw),
      }),
    ),
    ...unknownCapitalised(part.text, allowed).map((name): GuardIssue => ({
      code: 'UNKNOWN_ENTITY',
      detail: GATE_DETAILS.entity(name),
    })),
    ...guardIssues({
      headline: '',
      body: part.text,
      locale: input.locale,
      supported,
      allowed,
    }),
  ];
};

const repeatedRefs = (breakdown: AnalystBreakdown): GuardIssue[] => {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const name of PARTS) {
    const refs = new Set(breakdown[name].citedValues.map((c) => c.metricRef));
    for (const ref of refs) (seen.has(ref) ? repeated : seen).add(ref);
  }
  return [...repeated].map((ref) => ({
    code: 'REPETITION',
    detail: GATE_DETAILS.breakdownRepeat(ref),
  }));
};

/**
 * Gate checks for an Analyst breakdown: each part is held to the body's rules
 * (cited values, numbers, evidence, names, guard), only ANALYST carries one,
 * and each metric is cited in one part only.
 */
export const breakdownIssues = (
  draft: NarrativeDraft,
  input: Omit<PartInput, 'locale'>,
): GuardIssue[] => {
  const { breakdown } = draft;
  if (breakdown === undefined) return [];
  if (draft.persona !== 'ANALYST') {
    return [
      { code: 'SCHEMA_VIOLATION', detail: GATE_DETAILS.breakdownPersona },
    ];
  }
  const partInput = { ...input, locale: draft.locale };
  return [
    ...PARTS.flatMap((name) =>
      partIssues(breakdown[name], partInput).map((issue) => ({
        ...issue,
        detail: GATE_DETAILS.breakdownPart(name, issue.detail),
      })),
    ),
    ...repeatedRefs(breakdown),
  ];
};

/** The draft with its breakdown only when the breakdown passes; the body is gated separately. */
export const withGatedBreakdown = (
  draft: NarrativeDraft,
  input: Omit<PartInput, 'locale'>,
): NarrativeDraft => {
  if (breakdownIssues(draft, input).length === 0) return draft;
  const rest = { ...draft };
  delete rest.breakdown;
  return rest;
};

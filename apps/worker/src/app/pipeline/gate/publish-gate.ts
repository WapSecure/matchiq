import { z } from 'zod';
import {
  Locale,
  NarrativeDraft,
  OverlayProposal,
  Persona,
  type CitedValue,
  type EntityAllowlist,
  type Insight,
  type NarrativeSource,
} from '@matchiq/contracts';
import { verifyCitedValues, verifyEvidenceIds } from '@matchiq/football-engine';
import type { GateIssueCode, GateRejection } from '@matchiq/db';
import { GATE_DETAILS, PRIMARY_LOCALE } from '../../constants';
import {
  OVERLAY_LIMITS,
  PERSONA_LIMITS,
  type TextLimits,
} from './gate.constants';
import {
  allowedNameTokens,
  sentenceCount,
  unknownCapitalised,
  unsupportedNumerals,
} from './text-checks';

export interface GateContext {
  readonly insight: Insight;
  readonly entities: EntityAllowlist;
  readonly personas: readonly Persona[];
  readonly locales: readonly Locale[];
}

export interface GateIssue {
  readonly code: GateIssueCode;
  readonly detail: string;
}

type Verdict<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly issues: readonly GateIssue[] };

const verdict = <T>(value: T, issues: readonly GateIssue[]): Verdict<T> =>
  issues.length === 0 ? { ok: true, value } : { ok: false, issues };

const evidenceIssues = (
  insight: Insight,
  eventIds: readonly string[],
): GateIssue[] => {
  const unknown = verifyEvidenceIds(insight.evidence, eventIds);
  const issues: GateIssue[] = [];
  if (unknown.length > 0) {
    issues.push({
      code: 'UNCITED_EVIDENCE',
      detail: GATE_DETAILS.evidence(unknown.join(', ')),
    });
  }
  if (!eventIds.some((id) => insight.evidence.eventIds.includes(id))) {
    issues.push({
      code: 'UNCITED_EVIDENCE',
      detail: GATE_DETAILS.noEnvelopeEvidence,
    });
  }
  return issues;
};

const citedIssues = (
  insight: Insight,
  cited: readonly CitedValue[],
): GateIssue[] =>
  verifyCitedValues(insight.evidence, cited).map((issue) => ({
    code: 'UNSUPPORTED_NUMBER',
    detail: GATE_DETAILS.citedValue(issue.metricRef, issue.reason),
  }));

interface TextInput {
  readonly headline: string;
  readonly body: string;
  readonly locale: Locale;
  readonly supported: readonly number[];
  readonly limits: TextLimits;
}

const textIssues = (
  input: TextInput,
  entities: EntityAllowlist,
): GateIssue[] => {
  const text = `${input.headline}\n${input.body}`;
  const issues: GateIssue[] = [
    ...unsupportedNumerals(text, input.locale, input.supported).map(
      (raw): GateIssue => ({
        code: 'UNSUPPORTED_NUMBER',
        detail: GATE_DETAILS.textNumber(raw),
      }),
    ),
    ...unknownCapitalised(text, allowedNameTokens(entities)).map(
      (name): GateIssue => ({
        code: 'UNKNOWN_ENTITY',
        detail: GATE_DETAILS.entity(name),
      }),
    ),
  ];
  const { limits } = input;
  for (const [field, value, max] of [
    ['headline', input.headline, limits.headlineMax],
    ['body', input.body, limits.bodyMax],
  ] as const) {
    if (value.length > max) {
      issues.push({
        code: 'LENGTH_EXCEEDED',
        detail: GATE_DETAILS.length(field, max),
      });
    }
  }
  if (
    limits.maxSentences !== undefined &&
    sentenceCount(input.body) > limits.maxSentences
  ) {
    issues.push({
      code: 'LENGTH_EXCEEDED',
      detail: GATE_DETAILS.sentences(limits.maxSentences),
    });
  }
  return issues;
};

const schemaIssues = (error: {
  issues: readonly { path: PropertyKey[]; message: string }[];
}): GateIssue[] =>
  error.issues.map((i) => ({
    code: 'SCHEMA_VIOLATION',
    detail: GATE_DETAILS.schema(i.path.map(String).join('.'), i.message),
  }));

/**
 * The deterministic publish gate for one narrative draft (ADR-0002): every
 * cited value must equal the envelope's, every number in the text must be a
 * cited value, evidence ids must come from the envelope, capitalised names
 * from the entity allowlist, and lengths must fit the persona.
 */
export const gateNarrative = (
  raw: unknown,
  ctx: GateContext,
): Verdict<NarrativeDraft> => {
  const parsed = NarrativeDraft.safeParse(raw);
  if (!parsed.success) return { ok: false, issues: schemaIssues(parsed.error) };
  const draft = parsed.data;
  const issues: GateIssue[] = [];
  if (
    !ctx.personas.includes(draft.persona) ||
    !ctx.locales.includes(draft.locale)
  ) {
    issues.push({
      code: 'UNREQUESTED_VARIANT',
      detail: GATE_DETAILS.unrequested(draft.persona, draft.locale),
    });
  }
  issues.push(
    ...citedIssues(ctx.insight, draft.citedValues),
    ...evidenceIssues(ctx.insight, draft.evidenceEventIds),
    ...textIssues(
      {
        headline: draft.headline,
        body: draft.body,
        locale: draft.locale,
        supported: draft.citedValues.map((c) => c.value),
        limits: PERSONA_LIMITS[draft.persona],
      },
      ctx.entities,
    ),
  );
  return verdict(draft, issues);
};

/** Overlay proposals cite metricRefs instead of values; every number must resolve through them. */
export const gateOverlay = (
  raw: unknown,
  ctx: GateContext,
): Verdict<OverlayProposal> => {
  const parsed = OverlayProposal.safeParse(raw);
  if (!parsed.success) return { ok: false, issues: schemaIssues(parsed.error) };
  const proposal = parsed.data;
  const metrics = ctx.insight.evidence.computedMetrics;
  const unknownRefs = proposal.metricRefs.filter(
    (ref) => !Object.hasOwn(metrics, ref),
  );
  const supported = proposal.metricRefs.flatMap((ref) => {
    const value = metrics[ref];
    return value === undefined ? [] : [value];
  });
  const issues: GateIssue[] = [
    ...unknownRefs.map((ref): GateIssue => ({
      code: 'UNSUPPORTED_NUMBER',
      detail: GATE_DETAILS.metricRef(ref),
    })),
    ...evidenceIssues(ctx.insight, proposal.evidenceEventIds),
    ...textIssues(
      {
        headline: proposal.headline,
        body: proposal.body,
        locale: PRIMARY_LOCALE,
        supported,
        limits: OVERLAY_LIMITS,
      },
      ctx.entities,
    ),
  ];
  return verdict(proposal, issues);
};

export interface NarrativeSelection {
  readonly accepted: NarrativeDraft[];
  readonly rejected: GateRejection[];
}

const variantKey = (persona: Persona, locale: Locale) => `${persona}/${locale}`;

/** Gates every draft; the first passing draft per persona and locale wins. */
export const selectNarratives = (
  drafts: readonly unknown[],
  ctx: GateContext,
  source: NarrativeSource,
): NarrativeSelection => {
  const accepted = new Map<string, NarrativeDraft>();
  const rejected: GateRejection[] = [];
  for (const raw of drafts) {
    const result = gateNarrative(raw, ctx);
    if (!result.ok) {
      rejected.push(rejection('NARRATIVE', source, result.issues, raw));
      continue;
    }
    const key = variantKey(result.value.persona, result.value.locale);
    if (!accepted.has(key)) accepted.set(key, result.value);
  }
  return { accepted: [...accepted.values()], rejected };
};

const Variant = z.object({ persona: Persona, locale: Locale });

const variantOf = (raw: unknown): { persona?: Persona; locale?: Locale } => {
  const parsed = Variant.safeParse(raw);
  return parsed.success ? parsed.data : {};
};

export const rejection = (
  item: GateRejection['item'],
  source: NarrativeSource,
  issues: readonly GateIssue[],
  raw?: unknown,
): GateRejection => ({
  item,
  source,
  ...(item === 'NARRATIVE' ? variantOf(raw) : {}),
  codes: [...new Set(issues.map((i) => i.code))],
  details: issues.map((i) => i.detail),
});

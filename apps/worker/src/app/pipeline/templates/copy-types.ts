import type { ConfidenceLabel, InsightKind } from '@matchiq/contracts';
import type { TemplateFacts } from './template-facts';

type Line = (f: TemplateFacts) => string;

/**
 * Deterministic fallback copy for one locale (sourced TEMPLATE, never shown
 * as model output). Every digit comes from `f.v`, i.e. from cited values;
 * spelled-out numbers are avoided because the gate treats them as claims.
 */
export interface LocaleCopy {
  readonly headline: Readonly<Record<InsightKind, Line>>;
  /** One plain sentence (spec §27 casual persona). */
  readonly casual: Readonly<Record<InsightKind, Line>>;
  /** Evidence sentence appended to the casual line for analysts. */
  readonly analyst: Readonly<Record<InsightKind, Line>>;
  /** Overlay body, at most 140 characters. */
  readonly broadcast: Readonly<Record<InsightKind, Line>>;
  /** Used when a value the kind's copy needs is missing from the envelope. */
  readonly generic: { readonly headline: Line; readonly body: Line };
  readonly confidence: Readonly<Record<ConfidenceLabel, string>>;
}

export const scoreLine = (f: TemplateFacts): string =>
  `${f.home} ${f.v['homeGoals']}-${f.v['awayGoals']} ${f.away}`;

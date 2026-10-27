import type { Locale, Persona } from '@matchiq/contracts';
import {
  englishLanguageName,
  LOCALE_OPTIONS,
  PERSONA_LABELS,
  PERSONA_OPTIONS,
} from '@/constants/match';
import { FACT_CHECKS_COPY } from '@/constants/fact-checks';
import { splitRejections } from './rejection-split';
import type { InsightTrace } from '@/lib/api/trace-schemas';

const facts = FACT_CHECKS_COPY.facts;

/** The audiences and languages a moment's write-ups exist in, from the recap. */
export type Variants = {
  locales: readonly Locale[];
  personas: readonly Persona[];
};

export type TraceFact = {
  label: string;
  value: string;
  /** Plain detail shown on hover and focus. */
  tip?: string;
  tone?: 'ai' | 'standard' | 'warning' | 'muted';
};

const ALL_VARIANTS: Variants = {
  locales: LOCALE_OPTIONS.map((o) => o.value),
  personas: PERSONA_OPTIONS.map((o) => o.value),
};

const unique = <T>(items: readonly T[]) => [...new Set(items)];

const graphicFact = (trace: InsightTrace): TraceFact => {
  const editorial = trace.editorial?.overlay;
  if (editorial && editorial !== 'APPROVED')
    return {
      label: facts.graphic,
      value: facts.graphicValue[editorial],
      tone: 'warning',
    };
  if (!trace.gate)
    return {
      label: facts.graphic,
      value: facts.graphicValue.pending,
      tone: 'muted',
    };
  const ai = trace.gate.overlayRevision !== null;
  return {
    label: facts.graphic,
    value: ai ? facts.graphicValue.aiWording : facts.graphicValue.standard,
    tone: ai ? 'ai' : 'standard',
  };
};

const checkFact = (gate: InsightTrace['gate']): TraceFact => {
  if (!gate)
    return {
      label: facts.check,
      value: facts.checkValue.pending,
      tone: 'muted',
    };
  const caught = splitRejections(gate.rejected).caught.length;
  return caught === 0
    ? { label: facts.check, value: facts.checkValue.passed, tone: 'standard' }
    : {
        label: facts.check,
        value: facts.checkValue.caught(caught),
        tone: 'warning',
      };
};

/** Recap variants when known; else the full set when the count matches it. */
const variantsOf = (
  published: number,
  known: Variants | null,
): Variants | null => {
  if (known && known.locales.length > 0) return known;
  const full = ALL_VARIANTS.locales.length * ALL_VARIANTS.personas.length;
  return published === full ? ALL_VARIANTS : null;
};

const reachFact = (
  gate: InsightTrace['gate'],
  known: Variants | null,
): TraceFact | null => {
  if (!gate || gate.publishedNarratives === 0) return null;
  const v = variantsOf(gate.publishedNarratives, known);
  if (!v)
    return {
      label: facts.reach,
      value: facts.writeUps(gate.publishedNarratives),
    };
  const locales = unique(v.locales);
  const personas = unique(v.personas);
  return {
    label: facts.reach,
    value: facts.reachValue(locales.length, personas.length),
    tip: facts.reachTip(
      locales.map(englishLanguageName),
      personas.map((p) => PERSONA_LABELS[p]),
    ),
  };
};

/** Commentary, graphic, fact check and reach as separate labelled facts. */
export const traceFacts = (
  trace: InsightTrace,
  variants: Variants | null,
): TraceFact[] =>
  [
    {
      label: facts.commentary,
      value: facts.written[trace.publication],
      tone:
        trace.publication === 'AGENT'
          ? ('ai' as const)
          : trace.publication === 'TEMPLATE'
            ? ('standard' as const)
            : ('muted' as const),
    },
    graphicFact(trace),
    checkFact(trace.gate),
    reachFact(trace.gate, variants),
  ].filter((f): f is TraceFact => f !== null);

import type {
  Fixture,
  Insight,
  Locale,
  NarrativeDraft,
  OverlayProposal,
  Persona,
} from '@matchiq/contracts';
import {
  OVERLAY_KIND_BY_INSIGHT,
  OVERLAY_PRIORITY,
  OVERLAY_TIMING,
  PRIMARY_LOCALE,
} from '../../constants';
import { COPY_EN } from './copy-en';
import { COPY_ES } from './copy-es';
import { COPY_FR } from './copy-fr';
import type { LocaleCopy } from './copy-types';
import { buildFacts, type TemplateFacts } from './template-facts';

const COPY: Readonly<Record<Locale, LocaleCopy>> = {
  'en-GB': COPY_EN,
  'fr-FR': COPY_FR,
  'es-ES': COPY_ES,
};

interface Copy {
  readonly headline: string;
  readonly body: string;
}

const textFor = (
  copy: LocaleCopy,
  facts: TemplateFacts,
  persona: Persona,
): Copy => {
  if (!facts.complete) {
    return {
      headline: copy.generic.headline(facts),
      body: copy.generic.body(facts),
    };
  }
  const headline = copy.headline[facts.kind](facts);
  const casual = copy.casual[facts.kind](facts);
  switch (persona) {
    case 'CASUAL':
      return { headline, body: casual };
    case 'ANALYST':
      return { headline, body: `${casual} ${copy.analyst[facts.kind](facts)}` };
    case 'BROADCAST':
      return { headline, body: copy.broadcast[facts.kind](facts) };
  }
};

/**
 * The deterministic narrative for one persona and locale, used only when AI
 * is disabled or the agents pipeline fails. It is marked `TEMPLATE` and goes
 * through the same publish gate as agent drafts.
 */
export const templateDraft = (
  insight: Insight,
  fixture: Fixture,
  variant: { persona: Persona; locale: Locale },
): NarrativeDraft => {
  const copy = COPY[variant.locale];
  const { facts, cited } = buildFacts(
    insight,
    fixture,
    variant.locale,
    copy.confidence,
  );
  return {
    persona: variant.persona,
    locale: variant.locale,
    ...textFor(copy, facts, variant.persona),
    evidenceEventIds: [...insight.evidence.eventIds],
    citedValues: cited,
    source: 'TEMPLATE',
    localeFallback: false,
  };
};

export const templateDrafts = (
  insight: Insight,
  fixture: Fixture,
  variants: { personas: readonly Persona[]; locales: readonly Locale[] },
): NarrativeDraft[] =>
  variants.personas.flatMap((persona) =>
    variants.locales.map((locale) =>
      templateDraft(insight, fixture, { persona, locale }),
    ),
  );

/** Deterministic overlay: kind, priority and duration follow the insight; copy is the broadcast template. */
export const templateOverlay = (
  insight: Insight,
  fixture: Fixture,
): OverlayProposal => {
  const draft = templateDraft(insight, fixture, {
    persona: 'BROADCAST',
    locale: PRIMARY_LOCALE,
  });
  const kind = OVERLAY_KIND_BY_INSIGHT[insight.kind];
  return {
    kind,
    priority: OVERLAY_PRIORITY[insight.priority],
    durationMs: OVERLAY_TIMING.durationByKind[kind],
    headline: draft.headline,
    body: draft.body,
    evidenceEventIds: draft.evidenceEventIds,
    metricRefs: draft.citedValues.map((c) => c.metricRef),
  };
};

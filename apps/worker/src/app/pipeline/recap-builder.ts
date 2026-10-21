import type { Insight, MatchSnapshot, Narrative } from '@matchiq/contracts';
import type { RecapDocument, RecapMoment } from '@matchiq/db';

export interface RecapInput {
  readonly fixtureId: string;
  readonly title: string;
  readonly snapshot: MatchSnapshot;
  /** In detection order, with the period each was detected in. */
  readonly insights: readonly { insight: Insight; period: number }[];
  readonly narratives: readonly Narrative[];
}

const PERSONA_ORDER = ['CASUAL', 'ANALYST', 'BROADCAST'];
const LOCALE_ORDER = ['en-GB', 'fr-FR', 'es-ES', 'pcm-NG'];

const byVariant = (a: Narrative, b: Narrative): number =>
  PERSONA_ORDER.indexOf(a.persona) - PERSONA_ORDER.indexOf(b.persona) ||
  LOCALE_ORDER.indexOf(a.locale) - LOCALE_ORDER.indexOf(b.locale);

const momentOf = (
  { insight, period }: RecapInput['insights'][number],
  narratives: readonly Narrative[],
): RecapMoment => ({
  insightId: insight.insightId,
  kind: insight.kind,
  priority: insight.priority,
  period,
  matchClockMs: insight.matchClockMs,
  ...(insight.teamId === undefined ? {} : { teamId: insight.teamId }),
  ...(insight.playerId === undefined ? {} : { playerId: insight.playerId }),
  reasonCode: insight.reasonCode,
  confidenceLabel: insight.evidence.confidenceLabel,
  evidenceEventIds: [...insight.evidence.eventIds],
  metricRefs: Object.keys(insight.evidence.computedMetrics).sort(),
  narratives: narratives
    .filter((n) => n.insightId === insight.insightId)
    .sort(byVariant)
    .map((n) => ({
      persona: n.persona,
      locale: n.locale,
      headline: n.headline,
      body: n.body,
      source: n.source,
      citations: [...n.citations],
    })),
});

/**
 * MQ-013 recap: key moments in match order with their evidence ids and the
 * narratives the gate published, plus the final deterministic snapshot.
 * Contains no wall-clock values, so equal inputs give an equal document.
 */
export const buildRecap = (input: RecapInput): RecapDocument => ({
  schemaVersion: 1,
  fixtureId: input.fixtureId,
  title: input.title,
  finalSnapshot: input.snapshot,
  keyMoments: [...input.insights]
    .sort(
      (a, b) =>
        a.period - b.period || a.insight.matchClockMs - b.insight.matchClockMs,
    )
    .map((entry) => momentOf(entry, input.narratives)),
  synthetic: true,
});

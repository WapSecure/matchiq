import type {
  Fixture,
  Insight,
  MatchSnapshot,
  MatchStory,
  Narrative,
} from '@matchiq/contracts';
import type { RecapDocument, RecapMoment } from '@matchiq/db';
import { buildStories } from './story/match-story';
import { paragraphIssues } from './story/story-verify';

export interface RecapInput {
  readonly fixtureId: string;
  readonly title: string;
  readonly snapshot: MatchSnapshot;
  /** In detection order, with the period each was detected in. */
  readonly insights: readonly { insight: Insight; period: number }[];
  readonly narratives: readonly Narrative[];
  /** Team and player names for the match story; without it the recap has no story. */
  readonly fixture?: Fixture;
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
      localeFallback: n.localeFallback,
      citations: [...n.citations],
      ...(n.breakdown && { breakdown: n.breakdown }),
    })),
});

/** Deterministic stories, keeping only paragraphs whose every number checks out. */
const storiesOf = (input: RecapInput, fixture: Fixture): MatchStory[] => {
  const sources = {
    snapshot: input.snapshot,
    insights: input.insights.map((e) => e.insight),
  };
  return buildStories({
    fixture,
    snapshot: input.snapshot,
    insights: input.insights,
  })
    .map((story) => ({
      ...story,
      paragraphs: story.paragraphs.filter(
        (p) => paragraphIssues(p, story.locale, sources).length === 0,
      ),
    }))
    .filter((story) => story.paragraphs.length > 0);
};

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
  ...(input.fixture && { story: storiesOf(input, input.fixture) }),
  synthetic: true,
});

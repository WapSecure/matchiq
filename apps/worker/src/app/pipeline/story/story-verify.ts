import type {
  Insight,
  Locale,
  MatchSnapshot,
  StoryParagraph,
} from '@matchiq/contracts';
import { unsupportedNumerals } from '../gate/text-checks';
import { momentMetric, snapshotValue } from './story-facts';

export interface StorySources {
  readonly snapshot: MatchSnapshot;
  readonly insights: readonly Insight[];
}

/**
 * Why a story paragraph is not grounded: a number in the text that is not
 * cited, a citation that differs from the snapshot or its moment, or an
 * event or moment that is not part of the match. Empty means grounded.
 */
export const paragraphIssues = (
  paragraph: StoryParagraph,
  locale: Locale,
  sources: StorySources,
): string[] => {
  const byId = new Map(sources.insights.map((i) => [i.insightId, i]));
  const events = new Set(sources.insights.flatMap((i) => i.evidence.eventIds));
  const issues = unsupportedNumerals(
    paragraph.text,
    locale,
    paragraph.citedValues.map((c) => c.value),
  ).map((raw) => `number ${raw} is not cited`);
  for (const cited of paragraph.citedValues) {
    const insight =
      cited.insightId === undefined ? undefined : byId.get(cited.insightId);
    const actual =
      cited.insightId === undefined
        ? snapshotValue(sources.snapshot, cited.metricRef)
        : insight && momentMetric(insight, cited.metricRef);
    if (actual !== cited.value) {
      issues.push(`${cited.metricRef} cites ${cited.value}, not ${actual}`);
    }
  }
  for (const id of paragraph.insightIds) {
    if (!byId.has(id)) issues.push(`unknown moment ${id}`);
  }
  for (const id of paragraph.eventIds) {
    if (!events.has(id)) issues.push(`unknown event ${id}`);
  }
  return issues;
};

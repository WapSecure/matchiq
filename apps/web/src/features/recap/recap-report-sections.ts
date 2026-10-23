import type { Locale, Persona } from '@matchiq/contracts';
import { BREAKDOWN_COPY, BREAKDOWN_PARTS } from '@/constants/match';
import { RECAP_COPY, STORY_KIND_LABELS } from '@/constants/recap';
import type { RecapDocument } from '@/lib/api/session-schemas';
import type { RecapNarrativeView } from './pick-narrative';
import { pickStory } from './pick-story';

const copy = RECAP_COPY.report;

/** The story section with a trailing blank line, or nothing on older recaps. */
export const storyLines = (
  recap: RecapDocument,
  persona: Persona,
  locale: Locale,
): string[] => {
  const picked = pickStory(recap.story, persona, locale);
  if (!picked) return [];
  return [
    copy.story,
    ...(picked.notice ? [picked.notice] : []),
    ...picked.story.paragraphs.map((p) =>
      copy.storyParagraph(STORY_KIND_LABELS[p.kind], p.text),
    ),
    '',
  ];
};

/** Indented Analyst breakdown lines under a moment, when it has one. */
export const breakdownLines = (picked: RecapNarrativeView | null): string[] => {
  const breakdown = picked?.narrative.breakdown;
  if (!breakdown) return [];
  return BREAKDOWN_PARTS.map((part) =>
    copy.breakdownLine(BREAKDOWN_COPY.parts[part], breakdown[part].text),
  );
};

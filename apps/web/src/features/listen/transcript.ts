import type { Narrative } from '@matchiq/contracts';
import { SENTENCE_END } from '@/constants/listen';
import { BREAKDOWN_PARTS } from '@/constants/match';

const endSentence = (text: string) =>
  SENTENCE_END.test(text) ? text : `${text}.`;

/** The write-up as it is shown: headline, then the body or breakdown parts. */
export const narrativeTranscript = (
  narrative: Pick<Narrative, 'headline' | 'body' | 'breakdown'>,
): string => {
  const { breakdown } = narrative;
  const parts = breakdown
    ? BREAKDOWN_PARTS.map((part) => breakdown[part].text)
    : [narrative.body];
  return [narrative.headline, ...parts]
    .filter(Boolean)
    .map(endSentence)
    .join(' ');
};

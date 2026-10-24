import {
  LIMITS,
  type Locale,
  type StoryCitation,
  type StoryParagraph,
  type StoryParagraphKind,
} from '@matchiq/contracts';
import { formatNumber } from '../templates/template-facts';
import type { StoryCopy } from './story-copy-types';
import {
  SNAPSHOT_REFS,
  snapshotValue,
  type StoryFacts,
  type StoryMoment,
  type StorySide,
} from './story-facts';

export interface Sentence {
  readonly text: string;
  readonly cited: readonly StoryCitation[];
  readonly moments: readonly StoryMoment[];
}

export interface Writer {
  readonly copy: StoryCopy;
  readonly locale: Locale;
  readonly facts: StoryFacts;
  /** Livelier Fan wording. */
  readonly fan?: boolean;
}

export const num = (w: Writer, c: StoryCitation): string =>
  formatNumber(c.value, w.locale);

export const atOf = (w: Writer, m: StoryMoment): string =>
  w.copy.at(m.minute === undefined ? undefined : num(w, m.minute));

export const minuteCite = (m: StoryMoment): StoryCitation[] =>
  m.minute === undefined ? [] : [m.minute];

export const snapshotCite = (w: Writer, ref: string): StoryCitation => ({
  metricRef: ref,
  value: snapshotValue(w.facts.snapshot, ref) ?? 0,
});

export const finalGoals = (w: Writer, side: StorySide): StoryCitation =>
  snapshotCite(w, SNAPSHOT_REFS.goals(side));

/** Keeps the first sentence and as many of the rest as fit one paragraph. */
export const paragraph = (
  kind: StoryParagraphKind,
  sentences: readonly Sentence[],
): StoryParagraph | null => {
  const kept: Sentence[] = [];
  for (const sentence of sentences) {
    const text = [...kept, sentence].map((s) => s.text).join(' ');
    if (kept.length > 0 && text.length > LIMITS.storyParagraphMax) break;
    kept.push(sentence);
  }
  if (kept.length === 0) return null;
  const moments = kept.flatMap((s) => s.moments);
  return {
    kind,
    text: kept.map((s) => s.text).join(' '),
    citedValues: kept.flatMap((s) => s.cited),
    eventIds: [...new Set(moments.flatMap((m) => m.insight.evidence.eventIds))],
    insightIds: [...new Set(moments.map((m) => m.insight.insightId))],
  };
};

export const goalSentence = (w: Writer, m: StoryMoment): Sentence => ({
  text: w.copy.goal(m.player, m.team, atOf(w, m)),
  cited: minuteCite(m),
  moments: [m],
});

export const redSentence = (w: Writer, m: StoryMoment): Sentence => ({
  text: w.copy.red(m.player, m.team, atOf(w, m)),
  cited: minuteCite(m),
  moments: [m],
});

export const swingSentence = (w: Writer, m: StoryMoment): Sentence => ({
  text: w.copy.swing(m.team, atOf(w, m)),
  cited: minuteCite(m),
  moments: [m],
});

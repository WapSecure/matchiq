import type { Insight, MatchEvent } from '@matchiq/contracts';
import type { Side } from '@/components/match/team-swatch';
import type { Roster } from './roster';

export type SeekMark = {
  id: string;
  sequence: number;
  kind: 'goal' | 'moment';
  side: Side | null;
};

/**
 * Goals and key moments placed on the replay by event sequence, the seek
 * bar's own scale. A moment sits at the last play behind it; one whose plays
 * are outside the loaded timeline is left off rather than guessed.
 */
export const buildSeekMarks = (
  timeline: readonly MatchEvent[],
  voided: Readonly<Record<string, string>>,
  insights: readonly Insight[],
  roster: Roster,
): SeekMark[] => {
  const sequenceOf = new Map<string, number>();
  const marks: SeekMark[] = [];
  for (const event of timeline) {
    sequenceOf.set(event.eventId, event.sequence);
    if (event.type !== 'GOAL' || voided[event.eventId]) continue;
    marks.push({
      id: event.eventId,
      sequence: event.sequence,
      kind: 'goal',
      side: roster.team(event.teamId)?.side ?? null,
    });
  }
  for (const insight of insights) {
    if (insight.kind === 'GOAL') continue;
    const sequences = insight.evidence.eventIds
      .map((id) => sequenceOf.get(id))
      .filter((n): n is number => n !== undefined);
    if (sequences.length === 0) continue;
    marks.push({
      id: insight.insightId,
      sequence: Math.max(...sequences),
      kind: 'moment',
      side: roster.team(insight.teamId)?.side ?? null,
    });
  }
  return marks;
};

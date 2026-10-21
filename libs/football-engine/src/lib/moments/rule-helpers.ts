import type { CounterEvidence } from '@matchiq/contracts';
import { entriesIn } from '../metrics/windows.js';
import { opponentOf } from '../projection/initial-state.js';
import type { Side, TimelineEntry, TrackedKind } from '../types.js';
import type { RuleInput } from './types.js';

export const teamName = (input: RuleInput, side: Side): string =>
  input.context.teamNames[side];

export const windowEntries = (
  input: RuleInput,
  side: Side,
  kind: TrackedKind,
): TimelineEntry[] =>
  entriesIn(input.derived.timelines[side][kind], input.window);

export const idsOf = (entries: readonly TimelineEntry[]): string[] =>
  entries.map((e) => e.eventId);

/** Counter-evidence from the opponent's events of `kind` in the current window, if any. */
export const opponentCounter = (
  input: RuleInput,
  side: Side,
  kind: TrackedKind,
  describe: (team: string, count: number) => string,
): CounterEvidence[] => {
  const opponent = opponentOf(side);
  const entries = windowEntries(input, opponent, kind);
  if (entries.length === 0) return [];
  return [
    {
      description: describe(teamName(input, opponent), entries.length),
      eventIds: idsOf(entries),
    },
  ];
};

const SAMPLE_KINDS: readonly TrackedKind[] = [
  'shots',
  'pressures',
  'recoveries',
  'finalThirdEntries',
];

/** Distinct tracked events (both sides) in the window; on-target and high subsets excluded. */
export const sampleSize = (input: RuleInput): number =>
  (['home', 'away'] as const).reduce(
    (sum, side) =>
      sum +
      SAMPLE_KINDS.reduce(
        (inner, kind) => inner + windowEntries(input, side, kind).length,
        0,
      ),
    0,
  );

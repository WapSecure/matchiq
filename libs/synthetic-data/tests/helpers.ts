import type { Fixture, MatchEvent } from '@matchiq/contracts';
import { generateMatch } from '../src/index.js';
import type { ScenarioName } from '../src/index.js';

const cache = new Map<string, { fixture: Fixture; events: MatchEvent[] }>();

/** Returns a fresh deep copy so tests can mutate freely. */
export const sampleMatch = (
  scenario: ScenarioName = 'comeback',
  seed = 42,
): { fixture: Fixture; events: MatchEvent[] } => {
  const key = `${scenario}:${seed}`;
  let match = cache.get(key);
  if (match === undefined) {
    const generated = generateMatch({ seed, scenario });
    match = { fixture: generated.fixture, events: generated.events };
    cache.set(key, match);
  }
  return structuredClone(match);
};

export const findEvent = <T extends MatchEvent['type']>(
  events: readonly MatchEvent[],
  type: T,
  predicate: (event: Extract<MatchEvent, { type: T }>) => boolean = () => true,
): Extract<MatchEvent, { type: T }> => {
  const found = events.find(
    (e): e is Extract<MatchEvent, { type: T }> =>
      e.type === type && predicate(e as Extract<MatchEvent, { type: T }>),
  );
  if (found === undefined) throw new Error(`no ${type} event in sample`);
  return found;
};

/** Re-stamps sequence numbers after an insertion or removal. */
export const resequence = (events: MatchEvent[]): MatchEvent[] =>
  events.map((event, index) => ({ ...event, sequence: index }));

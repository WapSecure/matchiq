import { hashEvents } from '../src/index.js';
import { sampleMatch } from './helpers.js';

describe('hashEvents', () => {
  it('is insensitive to key order but sensitive to content', () => {
    const { events } = sampleMatch();
    const reordered = events.map((event) =>
      Object.fromEntries(Object.entries(event).reverse()),
    ) as typeof events;
    expect(hashEvents(reordered)).toBe(hashEvents(events));
    const changed = structuredClone(events);
    const last = changed.at(-1);
    if (last === undefined) throw new Error('empty sample');
    last.matchClockMs += 1;
    expect(hashEvents(changed)).not.toBe(hashEvents(events));
  });
});

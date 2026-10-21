import type { EventsQuery } from './endpoints';

export const queryKeys = {
  fixtures: () => ['fixtures'] as const,
  fixture: (fixtureId: string) => ['fixtures', fixtureId] as const,
  events: (fixtureId: string, query: EventsQuery) =>
    ['fixtures', fixtureId, 'events', query] as const,
  state: (fixtureId: string) => ['fixtures', fixtureId, 'state'] as const,
};

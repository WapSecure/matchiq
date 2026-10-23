import type { AuditFilters } from './editorial-endpoints';
import type { EventsQuery, NarrativeQuery } from './endpoints';

export const queryKeys = {
  templates: () => ['fixture-templates'] as const,
  sessions: () => ['replay-sessions'] as const,
  sessionsPage: (page: { cursor?: string; limit: number }) =>
    ['replay-sessions', page] as const,
  fixture: (fixtureId: string) => ['fixtures', fixtureId] as const,
  events: (fixtureId: string, query: EventsQuery) =>
    ['fixtures', fixtureId, 'events', query] as const,
  state: (fixtureId: string) => ['fixtures', fixtureId, 'state'] as const,
  replay: (fixtureId: string) => ['fixtures', fixtureId, 'replay'] as const,
  insights: (fixtureId: string) => ['fixtures', fixtureId, 'insights'] as const,
  narratives: (fixtureId: string, query: NarrativeQuery) =>
    ['fixtures', fixtureId, 'narratives', query] as const,
  overlays: (fixtureId: string) => ['fixtures', fixtureId, 'overlays'] as const,
  recap: (fixtureId: string) => ['fixtures', fixtureId, 'recap'] as const,
  agentRuns: (fixtureId: string) =>
    ['fixtures', fixtureId, 'agent-runs'] as const,
  editorial: (fixtureId: string) =>
    ['fixtures', fixtureId, 'editorial'] as const,
  auditEvents: (filters: AuditFilters) => ['audit-events', filters] as const,
};

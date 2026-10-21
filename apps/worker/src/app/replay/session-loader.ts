import type { Fixture, MatchEvent } from '@matchiq/contracts';
import type {
  FixtureKey,
  FixtureReader,
  PipelineUnitOfWork,
  ReplaySessionView,
  SessionStore,
  TemplateStore,
} from '@matchiq/db';

export interface LoadedSession {
  readonly session: ReplaySessionView;
  readonly fixture: Fixture;
  /** Template events rebased onto the session fixture. */
  readonly events: MatchEvent[];
  /** Highest sequence already in the session ledger, -1 when empty. */
  readonly ledgerHead: number;
}

export interface SessionSources {
  readonly sessions: SessionStore;
  readonly templates: TemplateStore;
  readonly fixtures: FixtureReader;
  readonly uow: PipelineUnitOfWork;
}

/** A session replays its template's events verbatim apart from `fixtureId`. */
export const rebaseEvents = (
  events: readonly MatchEvent[],
  fixtureId: string,
): MatchEvent[] => events.map((event) => ({ ...event, fixtureId }));

export const loadSession = async (
  sources: SessionSources,
  key: FixtureKey,
): Promise<LoadedSession | null> => {
  const session = await sources.sessions.get(key);
  if (session === null) return null;
  const [template, fixture, ledgerHead] = await Promise.all([
    sources.templates.get(key.orgId, session.templateId),
    sources.fixtures.get(key),
    sources.uow.transaction((tx) => tx.ledgerHead(key)),
  ]);
  if (template === null || fixture === null) return null;
  return {
    session,
    fixture,
    events: rebaseEvents(template.events, key.fixtureId),
    ledgerHead,
  };
};

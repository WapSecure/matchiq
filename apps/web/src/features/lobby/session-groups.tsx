'use client';

import { useId } from 'react';
import { LOBBY_COPY } from '@/constants/lobby';
import type { ReplaySessionView } from '@/lib/api/session-schemas';
import { SessionRow } from './session-row';
import { useNow } from './use-now';

const copy = LOBBY_COPY.sessions;

type Group = { title: string; sessions: ReplaySessionView[] };

/** Replays still running lead, so joining one in progress is the first choice. */
const groupByLive = (sessions: readonly ReplaySessionView[]): Group[] =>
  [
    {
      title: copy.live,
      sessions: sessions.filter((s) => s.status.state !== 'COMPLETED'),
    },
    {
      title: copy.finished,
      sessions: sessions.filter((s) => s.status.state === 'COMPLETED'),
    },
  ].filter((group) => group.sessions.length > 0);

function SessionGroup({
  group,
  codeFor,
  now,
}: {
  group: Group;
  codeFor: (templateId: string) => string | undefined;
  now: number;
}) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId}>
      <h3
        id={headingId}
        className="eyebrow px-4 pt-4 pb-1 text-ink-subtle sm:px-5"
      >
        {group.title}
      </h3>
      <ul aria-labelledby={headingId} className="divide-y divide-line">
        {group.sessions.map((session) => (
          <SessionRow
            key={session.sessionId}
            session={session}
            code={codeFor(session.templateId)}
            now={now}
          />
        ))}
      </ul>
    </section>
  );
}

export function SessionGroups({
  sessions,
  codeFor,
}: {
  sessions: readonly ReplaySessionView[];
  codeFor: (templateId: string) => string | undefined;
}) {
  const now = useNow();
  return groupByLive(sessions).map((group) => (
    <SessionGroup key={group.title} group={group} codeFor={codeFor} now={now} />
  ));
}

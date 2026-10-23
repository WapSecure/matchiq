'use client';

import {
  REPLAY_SPEEDS,
  ReplaySpeed,
  type FaultScenario,
} from '@matchiq/contracts';
import { useId, useState } from 'react';
import { InlineProblem } from '@/components/feedback/inline-problem';
import { PlayIcon } from '@/components/icons';
import { Button } from '@/components/ui';
import { HTTP_STATUS } from '@/constants/api';
import { demoFaultPlan } from '@/constants/demo-faults';
import { LOBBY_COPY } from '@/constants/lobby';
import { REPLAY_COPY } from '@/constants/replay';
import { useStudioUi } from '@/features/studio/store';
import { isApiError } from '@/lib/api/api-error';
import { PUBLIC_ENV } from '@/lib/env';
import { DemoScenarioSelect } from './demo-scenario-select';
import { useStartSession } from './use-start-session';

type SessionStartProps = { templateId: string; title: string };

/** Speed picker and Start: creates a session and opens its studio. */
export function SessionStart({ templateId, title }: SessionStartProps) {
  const speedId = useId();
  const errorId = useId();
  const [speed, setSpeed] = useState<ReplaySpeed>(
    () => useStudioUi.getState().speed,
  );
  const [fault, setFault] = useState<FaultScenario | null>(null);
  const session = useStartSession();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor={speedId} className="sr-only">
        {LOBBY_COPY.speedFor(title)}
      </label>
      <select
        id={speedId}
        value={speed}
        onChange={(e) => {
          const parsed = ReplaySpeed.safeParse(Number(e.target.value));
          if (parsed.success) setSpeed(parsed.data);
        }}
        className="tabular h-8 rounded-md border border-control bg-surface px-2 text-sm text-ink shadow-panel hover:border-ink-subtle"
      >
        {REPLAY_SPEEDS.map((s) => (
          <option key={s} value={s}>
            {REPLAY_COPY.speedOption(s)}
          </option>
        ))}
      </select>
      <Button
        variant="primary"
        onClick={() =>
          session.start(
            templateId,
            speed,
            fault ? demoFaultPlan(fault) : undefined,
          )
        }
        disabled={session.pending}
        aria-label={LOBBY_COPY.startLabel(title)}
        aria-describedby={session.error ? errorId : undefined}
        leadingIcon={<PlayIcon size={14} />}
        className="ml-auto"
      >
        {session.pending ? LOBBY_COPY.starting : LOBBY_COPY.start}
      </Button>
      {PUBLIC_ENV.NEXT_PUBLIC_DEMO_MODE ? (
        <DemoScenarioSelect title={title} value={fault} onChange={setFault} />
      ) : null}
      {session.error ? (
        <div id={errorId} className="w-full">
          <InlineProblem
            error={session.error}
            lead={LOBBY_COPY.startFailed}
            message={
              isApiError(session.error) &&
              session.error.status === HTTP_STATUS.tooManyRequests
                ? LOBBY_COPY.rateLimited
                : undefined
            }
          />
        </div>
      ) : null}
    </div>
  );
}

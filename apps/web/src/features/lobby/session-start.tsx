'use client';

import type { FaultScenario, ReplaySpeed } from '@matchiq/contracts';
import { useId, useState } from 'react';
import { InlineProblem } from '@/components/feedback/inline-problem';
import { PlayIcon } from '@/components/icons';
import { Button } from '@/components/ui';
import { HTTP_STATUS } from '@/constants/api';
import { demoFaultPlan } from '@/constants/demo-faults';
import { usePageMessages } from '@/features/interface-language/use-page-messages';
import { useStudioUi } from '@/features/studio/store';
import { isApiError } from '@/lib/api/api-error';
import { PUBLIC_ENV } from '@/lib/env';
import { DemoScenarioSelect } from './demo-scenario-select';
import { SpeedSelect } from './speed-select';
import { useStartSession } from './use-start-session';

type SessionStartProps = { templateId: string; title: string };

function StartProblem({ id, error }: { id: string; error: unknown }) {
  const copy = usePageMessages().lobby;
  return (
    <div id={id}>
      <InlineProblem
        error={error}
        lead={copy.startFailed}
        message={
          isApiError(error) && error.status === HTTP_STATUS.tooManyRequests
            ? copy.rateLimited
            : undefined
        }
      />
    </div>
  );
}

/**
 * Speed, the demo failure (demo mode only) and Start on one row when the card
 * is wide enough, stacked otherwise. Starting creates a session and opens its studio.
 */
export function SessionStart({ templateId, title }: SessionStartProps) {
  const copy = usePageMessages().lobby;
  const errorId = useId();
  const [speed, setSpeed] = useState<ReplaySpeed>(
    () => useStudioUi.getState().speed,
  );
  const [fault, setFault] = useState<FaultScenario | null>(null);
  const session = useStartSession();
  return (
    <div className="@container flex flex-col gap-3">
      <div className="flex flex-col gap-3 @lg:flex-row @lg:items-end">
        <SpeedSelect title={title} value={speed} onChange={setSpeed} />
        {PUBLIC_ENV.NEXT_PUBLIC_DEMO_MODE ? (
          <DemoScenarioSelect title={title} value={fault} onChange={setFault} />
        ) : null}
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
          aria-label={copy.startLabel(title)}
          aria-describedby={session.error ? errorId : undefined}
          size="md"
          leadingIcon={<PlayIcon size={14} />}
          className="w-full shrink-0 @lg:ml-auto @lg:w-auto"
        >
          {session.pending ? copy.starting : copy.start}
        </Button>
      </div>
      {session.error ? (
        <StartProblem id={errorId} error={session.error} />
      ) : null}
    </div>
  );
}

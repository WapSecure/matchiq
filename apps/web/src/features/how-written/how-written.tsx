'use client';

import { useState } from 'react';
import { RequirePermission } from '@/components/auth/require-permission';
import { Disclosure } from '@/components/ui';
import { MOMENT_TRACE_COPY } from '@/constants/moment-trace';
import { HowWrittenBody } from './how-written-body';

type HowWrittenProps = {
  fixtureId: string;
  insightId: string;
  /** Names the moment for screen readers, e.g. "Goal 18'". */
  moment: string;
};

/**
 * Collapsed by default; nothing is requested until it first opens. Viewers
 * without permission to read agent traces do not see it at all.
 */
export function HowWritten({ fixtureId, insightId, moment }: HowWrittenProps) {
  const [opened, setOpened] = useState(false);
  return (
    <RequirePermission permission="agents:traces:read" fallback={null}>
      <div data-testid="how-written" className="basis-full">
        <Disclosure
          title={MOMENT_TRACE_COPY.title}
          onExpandedChange={(open) => open && setOpened(true)}
          panelClassName="pb-1"
        >
          {opened ? (
            <HowWrittenBody
              fixtureId={fixtureId}
              insightId={insightId}
              moment={moment}
            />
          ) : null}
        </Disclosure>
      </div>
    </RequirePermission>
  );
}

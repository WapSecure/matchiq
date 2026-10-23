'use client';

import type { PublishPolicy } from '@matchiq/contracts';
import { useState } from 'react';
import { CheckIcon } from '@/components/icons';
import { Badge, SegmentedControl } from '@/components/ui';
import { POLICY_COPY } from '@/constants/approval';
import { setPublishPolicy } from '@/lib/api/review-endpoints';
import { useCan } from '@/lib/auth/session-store';
import { CommandDialog } from '../editorial/command-dialog';
import { useEditorialCommand } from '../editorial/use-editorial-command';
import { useMatchStore } from '../store';
import { usePublishPolicy } from './approval-queue';

/**
 * Auto or Manual for this match. Picking the other option opens a
 * confirmation with a reason; the switch moves only once the API confirms.
 */
export function PublishPolicySwitch() {
  const fixtureId = useMatchStore((s) => s.fixtureId);
  const applyEditorial = useMatchStore((s) => s.applyEditorial);
  const policy = usePublishPolicy();
  const allowed = useCan('policy:configure');
  const [target, setTarget] = useState<PublishPolicy>('MANUAL');
  const copy = POLICY_COPY.to[target];
  const command = useEditorialCommand({
    run: (input) => setPublishPolicy(fixtureId, target, input),
    apply: (result) => applyEditorial(result.status, 'rest'),
    copy,
  });
  if (!allowed) {
    return (
      <Badge tone={policy === 'MANUAL' ? 'warning' : 'neutral'}>
        {POLICY_COPY.readOnly[policy]}
      </Badge>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <span aria-hidden className="text-micro text-ink-subtle">
        {POLICY_COPY.short}
      </span>
      <SegmentedControl
        legend={POLICY_COPY.legend}
        hideLegend
        options={POLICY_COPY.options}
        value={policy}
        onChange={(next) => {
          if (next === policy) return;
          setTarget(next);
          command.start();
        }}
      />
      <CommandDialog command={command} copy={copy} Icon={CheckIcon} />
    </div>
  );
}

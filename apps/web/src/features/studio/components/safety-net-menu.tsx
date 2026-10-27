'use client';

import { FaultScenario } from '@matchiq/contracts';
import { InlineProblem } from '@/components/feedback/inline-problem';
import { ShieldIcon } from '@/components/icons';
import { ActionButton, Menu, type MenuAction } from '@/components/ui';
import {
  demoFaultPlan,
  FAULT_SCENARIO_LABELS,
  FAULT_SCENARIO_SHORT,
} from '@/constants/demo-faults';
import { SAFETY_NET_COPY, SAFETY_NET_SPEED } from '@/constants/safety-net';
import { useStartSession } from '@/features/lobby/use-start-session';
import { useCan } from '@/lib/auth/session-store';
import { PUBLIC_ENV } from '@/lib/env';
import { useSessionTemplate } from '../hooks/use-session-template';

const ACTIONS: MenuAction[] = FaultScenario.options.map((scenario) => ({
  id: scenario,
  label: FAULT_SCENARIO_SHORT[scenario],
  description: FAULT_SCENARIO_LABELS[scenario],
}));

/**
 * Demo mode only. A planted failure is fixed when a session is created, so
 * this starts a new replay of the same match instead of changing this one.
 */
export function SafetyNetMenu({ sessionId }: { sessionId: string }) {
  const allowed = useCan('replay:control');
  const template = useSessionTemplate(sessionId);
  const session = useStartSession();
  if (!PUBLIC_ENV.NEXT_PUBLIC_DEMO_MODE || !allowed || !template) return null;

  const choose = (id: string) => {
    const parsed = FaultScenario.safeParse(id);
    if (parsed.success)
      session.start(
        template.templateId,
        SAFETY_NET_SPEED,
        demoFaultPlan(parsed.data),
      );
  };
  return (
    <div className="relative flex items-center gap-2">
      <Menu
        label={SAFETY_NET_COPY.menu}
        actions={ACTIONS}
        onAction={choose}
        placement="bottom end"
        trigger={
          <ActionButton
            variant="ghost"
            size="sm"
            isDisabled={session.pending}
            leadingIcon={<ShieldIcon size={14} />}
          >
            <span className="sr-only sm:not-sr-only">
              {SAFETY_NET_COPY.trigger}
            </span>
          </ActionButton>
        }
      />
      <p role="status" className="sr-only">
        {session.pending ? SAFETY_NET_COPY.starting : ''}
      </p>
      {session.pending ? (
        <span aria-hidden className="hidden text-xs text-ink-muted lg:inline">
          {SAFETY_NET_COPY.starting}
        </span>
      ) : null}
      {session.error ? (
        <div className="absolute top-full right-0 z-40 mt-2 w-72 bg-canvas">
          <InlineProblem
            error={session.error}
            lead={SAFETY_NET_COPY.startFailed}
          />
        </div>
      ) : null}
    </div>
  );
}

'use client';

import type { AgentStep } from '@matchiq/contracts';
import { useState } from 'react';
import { ErrorState } from '@/components/feedback';
import { Skeleton } from '@/components/ui';
import { LoadMore } from '@/components/ui/pagination';
import {
  AGENT_STEP_COPY,
  AGENT_STEPS_PAGE_SIZE,
} from '@/constants/agent-steps';
import type { InsightTrace } from '@/lib/api/trace-schemas';
import { AgentStepItem } from './agent-step-item';
import { useAgentSteps } from './use-agent-steps';

const copy = AGENT_STEP_COPY;

function Note({ children }: { children: string }) {
  return <p className="text-[13px] text-ink-subtle">{children}</p>;
}

function StepList({ steps, label }: { steps: AgentStep[]; label: string }) {
  const [limit, setLimit] = useState(AGENT_STEPS_PAGE_SIZE);
  const visible = steps.slice(0, limit);
  return (
    <>
      <ol aria-label={label} className="group/steps flex flex-col">
        {visible.map((step) => (
          <AgentStepItem key={step.stepIndex} step={step} />
        ))}
      </ol>
      {steps.length > AGENT_STEPS_PAGE_SIZE ? (
        <LoadMore
          shown={visible.length}
          total={steps.length}
          hasMore={visible.length < steps.length}
          onLoadMore={() => setLimit(limit + AGENT_STEPS_PAGE_SIZE)}
          noun={copy.noun}
          label={copy.moreLabel}
        />
      ) : null}
    </>
  );
}

function Body({ trace, label }: { trace: InsightTrace; label: string }) {
  const { ready, query } = useAgentSteps(trace);
  if (!ready) {
    return (
      <Note>{trace.publication === 'PENDING' ? copy.pending : copy.empty}</Note>
    );
  }
  if (query.isPending) {
    return (
      <div
        role="status"
        aria-label={copy.loading}
        className="flex flex-col gap-2"
      >
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
      </div>
    );
  }
  if (query.isError) {
    return (
      <ErrorState
        title={copy.error}
        error={query.error}
        onRetry={() => void query.refetch()}
      />
    );
  }
  const steps = query.data?.steps ?? [];
  if (steps.length === 0) return <Note>{copy.empty}</Note>;
  return <StepList steps={steps} label={label} />;
}

/** Per-moment hand-off timeline: analyst → writer → fact checker → translator → graphics. */
export function AgentStepTimeline({
  trace,
  moment,
}: {
  trace: InsightTrace;
  moment: string;
}) {
  const titleId = `steps-${trace.insightId}`;
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-2">
      <header>
        <h4 id={titleId} className="text-[13px] font-medium text-ink">
          {copy.title}
        </h4>
        <p className="text-micro text-ink-subtle">{copy.description}</p>
      </header>
      <Body trace={trace} label={copy.listLabel(moment)} />
    </section>
  );
}

'use client';

import type { AgentStep } from '@matchiq/contracts';
import {
  AGENT_STEP_COPY,
  HASH_PREVIEW_LENGTH,
  STEP_ROLE_LABELS,
} from '@/constants/agent-steps';
import { OBSERVATORY_COPY } from '@/constants/observatory';
import type { InsightTrace } from '@/lib/api/trace-schemas';
import { cn } from '@/lib/cn';
import { useAgentSteps } from './use-agent-steps';

const tech = AGENT_STEP_COPY.technical;
const cols = tech.columns;
const CELL = 'px-3 py-2 align-middle';
const MONO = cn(CELL, 'font-mono text-ink-muted');

const COLUMNS = [
  cols.step,
  cols.agent,
  cols.transition,
  cols.model,
  cols.version,
  cols.hash,
  cols.checksum,
  cols.tokens,
  cols.cost,
  cols.retries,
];

const short = (hash?: string) =>
  hash ? hash.slice(0, HASH_PREVIEW_LENGTH) : OBSERVATORY_COPY.notApplicable;

function Row({ step }: { step: AgentStep }) {
  return (
    <tr className="border-t border-line">
      <td className={cn(MONO, 'tabular')}>{step.stepIndex + 1}</td>
      <th scope="row" className={cn(CELL, 'font-medium text-ink')}>
        {STEP_ROLE_LABELS[step.role]}
      </th>
      <td className={MONO}>
        {tech.transition(step.fromStatus, step.toStatus)}
      </td>
      <td className={MONO}>{step.modelDeployment ?? step.provider}</td>
      <td className={MONO}>v{step.agentVersion.promptVersion}</td>
      <td className={MONO} title={step.agentVersion.promptHash}>
        {short(step.agentVersion.promptHash)}
      </td>
      <td className={MONO} title={step.inputChecksum}>
        {short(step.inputChecksum)}
      </td>
      <td className={cn(MONO, 'tabular')}>
        {tech.tokens(step.tokensIn, step.tokensOut)}
      </td>
      <td className={cn(MONO, 'tabular')}>{tech.cost(step.costEstimateUsd)}</td>
      <td className={cn(MONO, 'tabular')}>{step.retries}</td>
    </tr>
  );
}

/** Raw handoff fields for engineers and judges, inside Technical details. */
export function AgentStepTable({
  trace,
  caption,
}: {
  trace: InsightTrace;
  caption: string;
}) {
  const { query } = useAgentSteps(trace);
  const steps = query.data?.steps ?? [];
  if (steps.length === 0)
    return <p className="text-xs text-ink-subtle">{tech.none}</p>;
  return (
    <div
      className="overflow-x-auto rounded-md border border-line"
      tabIndex={0}
      role="group"
      aria-label={caption}
    >
      <table className="w-full min-w-[52rem] border-collapse text-left text-xs">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-surface-sunken text-ink-muted">
          <tr>
            {COLUMNS.map((label) => (
              <th key={label} scope="col" className={cn(CELL, 'font-medium')}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-surface">
          {steps.map((step) => (
            <Row key={step.stepIndex} step={step} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

'use client';

import { FaultScenario } from '@matchiq/contracts';
import { useId } from 'react';
import {
  DEMO_FAULT_COPY,
  FAULT_SCENARIO_LABELS,
} from '@/constants/demo-faults';

type DemoScenarioSelectProps = {
  title: string;
  value: FaultScenario | null;
  onChange: (value: FaultScenario | null) => void;
};

/** Advanced demo-mode control: start a session with a labelled simulated failure. */
export function DemoScenarioSelect({
  title,
  value,
  onChange,
}: DemoScenarioSelectProps) {
  const id = useId();
  const hintId = useId();
  return (
    <div className="flex w-full flex-col gap-1">
      <label htmlFor={id} className="text-micro text-ink-subtle">
        {DEMO_FAULT_COPY.label}
      </label>
      <select
        id={id}
        value={value ?? ''}
        aria-label={DEMO_FAULT_COPY.labelFor(title)}
        aria-describedby={hintId}
        onChange={(e) => {
          const parsed = FaultScenario.safeParse(e.target.value);
          onChange(parsed.success ? parsed.data : null);
        }}
        className="h-8 rounded-md border border-control bg-surface px-2 text-sm text-ink shadow-panel hover:border-ink-subtle"
      >
        <option value="">{DEMO_FAULT_COPY.none}</option>
        {FaultScenario.options.map((s) => (
          <option key={s} value={s}>
            {FAULT_SCENARIO_LABELS[s]}
          </option>
        ))}
      </select>
      <p id={hintId} className="text-micro text-ink-subtle">
        {DEMO_FAULT_COPY.hint}
      </p>
    </div>
  );
}

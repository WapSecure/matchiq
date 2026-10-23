'use client';

import { FaultScenario } from '@matchiq/contracts';
import { type ChoiceOption, InfoTip, Select } from '@/components/ui';
import {
  NO_FAULT_DESCRIPTION,
  NO_FAULT_KEY,
} from '@/constants/control-options';
import {
  DEMO_FAULT_COPY,
  FAULT_SCENARIO_LABELS,
  FAULT_SCENARIO_SHORT,
} from '@/constants/demo-faults';
import { LOBBY_COPY } from '@/constants/lobby';
import { ControlCaption } from './control-caption';

const OPTIONS: ChoiceOption[] = [
  {
    id: NO_FAULT_KEY,
    label: DEMO_FAULT_COPY.none,
    description: NO_FAULT_DESCRIPTION,
  },
  ...FaultScenario.options.map((s) => ({
    id: s,
    label: FAULT_SCENARIO_SHORT[s],
    description: FAULT_SCENARIO_LABELS[s],
  })),
];

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
  return (
    <div className="flex min-w-0 flex-col gap-1 @lg:flex-1">
      <ControlCaption text={DEMO_FAULT_COPY.label}>
        <InfoTip
          label={LOBBY_COPY.demoFaultInfo}
          content={DEMO_FAULT_COPY.hint}
          className="pointer-coarse:size-6!"
        />
      </ControlCaption>
      <Select
        label={DEMO_FAULT_COPY.labelFor(title)}
        hideLabel
        size="md"
        value={value ?? NO_FAULT_KEY}
        onChange={(id) => {
          const parsed = FaultScenario.safeParse(id);
          onChange(parsed.success ? parsed.data : null);
        }}
        options={OPTIONS}
        popoverWidth="wide"
      />
    </div>
  );
}

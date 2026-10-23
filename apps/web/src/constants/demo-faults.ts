import type { FaultPlanInput, FaultScenario } from '@matchiq/contracts';

/** Lobby and observatory copy for demo fault scenarios (ADR-0020). */
export const DEMO_FAULT_COPY = {
  label: 'Demo scenario',
  labelFor: (title: string) => `Demo scenario for ${title}`,
  none: 'No simulated failure',
  hint: 'Simulated failures for demos; never real inference.',
  badge: 'Simulated failure (demo)',
  chainTitle: 'Failure and recovery chain',
  finalSource: 'Final source',
} as const;

export const FAULT_SCENARIO_LABELS: Record<FaultScenario, string> = {
  WRITER_REVISE: 'Fact Checker rejects a draft, then a revision passes',
  MODEL_TIMEOUT: 'Model times out; templates air, breaker opens',
  GATE_REJECT: 'Publish gate rejects a draft; template airs',
};

export const FAULT_SCENARIO_SHORT: Record<FaultScenario, string> = {
  WRITER_REVISE: 'Revise',
  MODEL_TIMEOUT: 'Timeout',
  GATE_REJECT: 'Gate rejection',
};

/** Every third insight is faulted, starting with the first, so recovery is seen early. */
export const DEMO_FAULT_EVERY_NTH = 3;

export const demoFaultPlan = (scenario: FaultScenario): FaultPlanInput => ({
  scenario,
  everyNth: DEMO_FAULT_EVERY_NTH,
});

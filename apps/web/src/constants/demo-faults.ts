import type { FaultPlanInput, FaultScenario } from '@matchiq/contracts';

/** Lobby and AI fact-check copy for demo failure scenarios (ADR-0020). */
export const DEMO_FAULT_COPY = {
  label: 'Demo failure',
  labelFor: (title: string) => `Demo failure for ${title}`,
  none: 'No demo failure',
  hint: 'Plays a deliberate, labelled failure so you can watch the safety net work. Never used on air.',
  badge: 'Simulated failure (demo)',
  chainTitle: 'What we tested and how it recovered',
  finalSource: 'What went on air',
} as const;

export const FAULT_SCENARIO_LABELS: Record<FaultScenario, string> = {
  WRITER_REVISE: 'The fact checker catches a wrong number, then the writer fixes it',
  MODEL_TIMEOUT: 'The AI times out, so standard wording goes out on time',
  GATE_REJECT: 'The final fact check blocks a wrong number before air',
};

export const FAULT_SCENARIO_SHORT: Record<FaultScenario, string> = {
  WRITER_REVISE: 'Wrong number fixed',
  MODEL_TIMEOUT: 'AI timed out',
  GATE_REJECT: 'Wrong number blocked',
};

/** The demo failure told as a story; `recovered` is true when AI wording made it to air. */
export const FAULT_STORY: Record<
  FaultScenario,
  { setup: string; recovered: string; fallback: string }
> = {
  WRITER_REVISE: {
    setup:
      "We deliberately planted a wrong number in the AI's draft to show the safety net.",
    recovered:
      'The fact checker caught it and the writer corrected it. The corrected AI wording went on air.',
    fallback:
      'The fact checker caught it. The correction did not pass either, so standard wording went on air instead.',
  },
  MODEL_TIMEOUT: {
    setup:
      'We deliberately made the AI time out to show what happens when it is slow.',
    recovered:
      'MatchIQ retried, and the AI wording went on air once it arrived.',
    fallback:
      'Standard wording went on air on time, and MatchIQ paused AI writing briefly to recover.',
  },
  GATE_REJECT: {
    setup:
      'We deliberately slipped a made-up number past the AI checks to test the last line of defence.',
    recovered:
      'The final fact check blocked it before air. The other versions kept their AI wording.',
    fallback:
      'The final fact check blocked it before air, and standard wording was used instead.',
  },
};

/** Every third insight is faulted, starting with the first, so recovery is seen early. */
export const DEMO_FAULT_EVERY_NTH = 3;

export const demoFaultPlan = (scenario: FaultScenario): FaultPlanInput => ({
  scenario,
  everyNth: DEMO_FAULT_EVERY_NTH,
});

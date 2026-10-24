import {
  STEP_DECISION_LABELS,
  STEP_REASON_FALLBACK,
  STEP_REASONS,
} from './agent-steps';

describe('agent step wording (content style guide, section 12)', () => {
  it('describes outcomes without saying AI', () => {
    const lines = [
      ...Object.values(STEP_REASONS),
      ...Object.values(STEP_REASON_FALLBACK),
      ...Object.values(STEP_DECISION_LABELS),
    ];
    for (const line of lines) expect(line).not.toMatch(/\bAI\b/);
    expect(STEP_REASONS['MODEL_FALLBACK']).toBe(
      "The writer's draft wasn't usable, so prepared wording took over.",
    );
  });
});

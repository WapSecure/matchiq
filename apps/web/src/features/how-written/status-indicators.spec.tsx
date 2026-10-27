import type { AgentStep } from '@matchiq/contracts';
import { render, screen, within } from '@testing-library/react';
import { STEP_DECISION_LABELS } from '@/constants/agent-steps';
import { GATE_OUTCOMES, MOMENT_TRACE_COPY } from '@/constants/moment-trace';
import { AgentStepItem } from '@/features/observatory/agent-step-item';
import { ProviderBadge } from '@/features/observatory/provider-badge';
import { ChainView } from './chain-view';
import type { MomentChain } from './moment-chain';

const DECISIONS: AgentStep['decision'][] = [
  'PASS',
  'REVISE',
  'REJECT',
  'FALLBACK',
];

const step = (decision: AgentStep['decision']): AgentStep => ({
  stepIndex: 0,
  role: 'FACT_CHECKER',
  runId: 'run_1',
  correlationId: '29f9b4b3-d721-8eb6-9911-25ef49b3355c',
  agentVersion: { promptVersion: '2.0.0', promptHash: 'a'.repeat(64) },
  provider: 'foundry',
  modelDeployment: 'gpt-test',
  fromStatus: 'DETECTED',
  toStatus: 'ANALYZED',
  decision,
  reasonCode: 'GROUNDED',
  reason: 'checked',
  inputChecksum: 'b'.repeat(64),
  evidenceEventIds: [],
  metricRefs: [],
  startedAt: '2026-10-21T17:19:26.747Z',
  latencyMs: 1_200,
  tokensIn: 1,
  tokensOut: 1,
  retries: 0,
});

const chain = (caught: string[]): MomentChain => ({
  links: (Object.keys(GATE_OUTCOMES) as (keyof typeof GATE_OUTCOMES)[]).map(
    (key, i) => ({
      key,
      label: MOMENT_TRACE_COPY.gate,
      outcome: GATE_OUTCOMES[key],
      tone: DECISIONS[i === 1 ? 3 : i === 2 ? 2 : 0] as AgentStep['decision'],
      duration: '',
    }),
  ),
  extras: [],
  caught,
  heldBack: [],
  finalLine: null,
  standardReason: false,
});

describe('status is never carried by colour alone', () => {
  it.each(DECISIONS)(
    'writes out the %s decision as visible text',
    (decision) => {
      render(
        <ul>
          <AgentStepItem step={step(decision)} />
        </ul>,
      );
      const label = STEP_DECISION_LABELS[decision];
      const badge = screen.getByText(label);
      expect(badge).toBeVisible();
      expect(badge).not.toHaveAttribute('aria-hidden');
      expect(badge.textContent?.trim()).toBe(label);
    },
  );

  it('gives each decision a different word, so two states never share a label', () => {
    const words = DECISIONS.map((d) => STEP_DECISION_LABELS[d]);
    expect(new Set(words).size).toBe(words.length);
    expect(words).toEqual([
      'Passed',
      'Sent back',
      'Stopped',
      'Used a template',
    ]);
  });

  it('shows each publish-gate outcome as text', () => {
    render(<ChainView chain={chain([])} moment="Shot burst" />);
    const list = screen.getByRole('list', { name: /Steps behind Shot burst/ });
    for (const outcome of Object.values(GATE_OUTCOMES))
      expect(within(list).getByText(outcome)).toBeVisible();
  });

  it.each([
    [1, 'Caught 1 problem'],
    [3, 'Caught 3 problems'],
  ])('counts what the fact check caught in words (%i)', (n, text) => {
    render(
      <ChainView
        chain={chain(Array.from({ length: n }, (_, i) => `Issue ${i}`))}
        moment="Shot burst"
      />,
    );
    expect(screen.getByText(text)).toBeVisible();
  });

  it('labels template-written moments as standard wording in text', () => {
    render(<ProviderBadge provider="template" inline />);
    expect(screen.getByText('Standard wording')).toBeVisible();
  });
});

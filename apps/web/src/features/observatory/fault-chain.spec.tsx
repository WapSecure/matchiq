import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { run } from '@/test/session-factories';
import { DemoScenarioSelect } from '@/features/lobby/demo-scenario-select';
import { FaultChain, FaultNotes } from './fault-chain';

describe('FaultChain', () => {
  it('renders nothing for an ordinary trace', () => {
    const { container } = render(
      <FaultChain runs={[run({})]} publication="AGENT" />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('labels a simulated failure and lists the annotated steps in order', () => {
    const runs = [
      run({
        agent: 'MATCH_ANALYST',
        outcome: 'TIMED_OUT',
        startedAt: '2026-10-21T17:19:26.000Z',
        faultInjected: 'MODEL_TIMEOUT',
        faultNote: 'every model call raised a timeout',
      }),
      run({
        agent: 'NARRATIVE_WRITER',
        outcome: 'FAILED',
        startedAt: '2026-10-21T17:19:27.000Z',
        faultInjected: 'MODEL_TIMEOUT',
        faultNote: 'Circuit breaker open',
      }),
    ];
    render(<FaultChain runs={runs} publication="TEMPLATE" />);
    expect(
      screen.getByText('Simulated failure (demo): Timed out'),
    ).toBeInTheDocument();
    const chain = screen.getByTestId('fault-chain');
    expect(chain).toHaveTextContent(
      'We deliberately made the writer time out to show what happens when it is slow.',
    );
    expect(chain).toHaveTextContent('Standard wording went on air on time');
    expect(chain).toHaveTextContent('What went on air: Standard wording');
    expect(chain).not.toHaveTextContent('Circuit breaker');
  });

  it('keeps the raw annotated steps for Technical details, in order', () => {
    const runs = [
      run({
        agent: 'MATCH_ANALYST',
        outcome: 'TIMED_OUT',
        startedAt: '2026-10-21T17:19:26.000Z',
        faultInjected: 'MODEL_TIMEOUT',
        faultNote: 'every model call raised a timeout',
      }),
      run({
        agent: 'NARRATIVE_WRITER',
        outcome: 'FAILED',
        startedAt: '2026-10-21T17:19:27.000Z',
        faultInjected: 'MODEL_TIMEOUT',
        faultNote: 'Circuit breaker open',
      }),
    ];
    render(<FaultNotes runs={runs} />);
    const steps = screen.getAllByRole('listitem');
    expect(steps).toHaveLength(2);
    expect(steps[0]).toHaveTextContent('Analyst · Took too long');
    expect(steps[1]).toHaveTextContent('Circuit breaker open');
  });

  it('tells the writer-revise story with the corrected wording on air', () => {
    render(
      <FaultChain
        runs={[run({ faultInjected: 'WRITER_REVISE', faultNote: 'x' })]}
        publication="AGENT"
      />,
    );
    expect(screen.getByTestId('fault-chain')).toHaveTextContent(
      'We deliberately planted a wrong number in the draft to show the safety net. The fact checker caught it and the writer corrected it.',
    );
  });
});

describe('DemoScenarioSelect', () => {
  it('offers no failure by default and each simulated scenario', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DemoScenarioSelect title="Comeback" value={null} onChange={onChange} />,
    );
    const trigger = screen.getByRole('button', {
      name: /Demo failure for Comeback/,
    });
    expect(trigger).toHaveTextContent('No demo failure');
    await user.click(trigger);
    expect(screen.getAllByRole('option')).toHaveLength(4);
    await user.click(
      screen.getByRole('option', { name: /^Wrong number fixed/ }),
    );
    expect(onChange).toHaveBeenLastCalledWith('WRITER_REVISE');
  });
});

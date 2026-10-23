import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { run } from '@/test/session-factories';
import { DemoScenarioSelect } from '@/features/lobby/demo-scenario-select';
import { FaultChain } from './fault-chain';

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
      screen.getByText('Simulated failure (demo): Timeout'),
    ).toBeInTheDocument();
    const steps = screen.getAllByRole('listitem');
    expect(steps).toHaveLength(3);
    expect(steps[0]).toHaveTextContent('Match analyst · Timed out');
    expect(steps[1]).toHaveTextContent('Circuit breaker open');
    expect(steps[2]).toHaveTextContent('Final source: Template');
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
      name: /Demo scenario for Comeback/,
    });
    expect(trigger).toHaveTextContent('No simulated failure');
    await user.click(trigger);
    expect(screen.getAllByRole('option')).toHaveLength(4);
    await user.click(screen.getByRole('option', { name: /^Revise/ }));
    expect(onChange).toHaveBeenLastCalledWith('WRITER_REVISE');
  });
});

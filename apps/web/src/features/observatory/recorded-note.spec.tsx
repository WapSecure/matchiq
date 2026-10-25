import { render, screen } from '@testing-library/react';
import { PROVIDER_LABELS } from '@/constants/observatory';
import { run, trace } from '@/test/session-factories';
import { ProviderBadge } from './provider-badge';
import { RecordedNote } from './recorded-note';
import { RunTable } from './run-table';

const recordedTrace = trace({
  runs: [
    run({
      agent: 'NARRATIVE_WRITER',
      provider: 'recorded',
      outcome: 'SUCCEEDED',
    }),
  ],
});

describe('Recorded model run labelling', () => {
  it('names the provider honestly and never as a live model', () => {
    expect(PROVIDER_LABELS.recorded.label).toBe('Recorded model run');
    expect(PROVIDER_LABELS.recorded.hint).toBe(
      "Wording written by a model in an earlier run and replayed through today's checks",
    );
    expect(PROVIDER_LABELS.recorded.label).not.toMatch(/AI|local|Foundry/);
  });

  it('shows the label and its plain explanation on a badge', () => {
    render(<ProviderBadge provider="recorded" inline />);
    expect(screen.getByText('Recorded model run')).toBeInTheDocument();
    expect(
      screen.getByText(/replayed through today's checks/),
    ).toBeInTheDocument();
  });

  it('labels the run table rows as a recorded run, not AI (local model)', () => {
    render(<RunTable runs={recordedTrace.runs} caption="Runs" />);
    expect(screen.getByRole('table')).toHaveTextContent('Recorded model run');
    expect(screen.queryByText('AI (local model)')).not.toBeInTheDocument();
  });

  it('says it once on the page when any run was recorded', () => {
    render(<RecordedNote traces={[trace(), recordedTrace]} />);
    expect(screen.getByTestId('recorded-note')).toHaveTextContent(
      "Wording written by a model in an earlier run and replayed through today's checks.",
    );
  });

  it('stays out of the way when nothing was recorded', () => {
    render(<RecordedNote traces={[trace()]} />);
    expect(screen.queryByTestId('recorded-note')).not.toBeInTheDocument();
  });
});

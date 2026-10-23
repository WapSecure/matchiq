import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MomentumChart } from '@/components/charts/momentum-chart';
import { OverlayCanvas } from '@/components/overlay/overlay-canvas';
import { available, cue, unavailable } from '@/test/factories';
import { ConnectionStatus } from './connection-status';
import { MetricValueText } from './metric-value';
import { PossessionBar } from './possession-bar';
import { StatComparison } from './stat-comparison';

describe('unavailable metrics', () => {
  it('renders the reason instead of zero', () => {
    const { container } = render(<MetricValueText metric={unavailable} />);
    expect(screen.getByText('Not available')).toBeInTheDocument();
    expect(screen.getByText('No tracking data')).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/\b0\b/);
  });

  it('does not draw a split possession bar when either side is unavailable', () => {
    render(
      <PossessionBar
        label="Possession"
        homeName="Home"
        awayName="Away"
        home={unavailable}
        away={available(45)}
        basis="EVENT_SHARE_PROXY"
      />,
    );
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('Not available')).toBeInTheDocument();
    expect(screen.getByText('Event-share proxy')).toBeInTheDocument();
  });

  it('renders an accessible possession split when both sides are known', () => {
    render(
      <PossessionBar
        label="Possession"
        homeName="Home"
        awayName="Away"
        home={available(55)}
        away={available(45)}
        basis="TIME_WEIGHTED"
      />,
    );
    expect(
      screen.getByRole('img', { name: 'Home 55%, Away 45%' }),
    ).toBeInTheDocument();
  });

  it('shows whole-percent shares that sum to 100', () => {
    render(
      <PossessionBar
        label="Possession"
        homeName="Home"
        awayName="Away"
        home={available(48.5)}
        away={available(51.5)}
        basis="TIME_WEIGHTED"
      />,
    );
    expect(
      screen.getByRole('img', { name: 'Home 49%, Away 51%' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('52%')).not.toBeInTheDocument();
  });

  it('keeps comparison values as table text, not colour alone', () => {
    render(
      <StatComparison
        caption="Team comparison"
        homeName="Home"
        awayName="Away"
        rows={[
          { key: 'shots', label: 'Shots', kind: 'count', home: 7, away: 4 },
          {
            key: 'pc',
            label: 'Pass completion',
            kind: 'metric',
            home: available(85),
            away: unavailable,
          },
        ]}
      />,
    );
    const row = screen.getByRole('row', { name: /Shots/ });
    expect(within(row).getByText('7')).toBeInTheDocument();
    expect(within(row).getByText('4')).toBeInTheDocument();
    expect(
      within(screen.getByRole('row', { name: /Pass completion/ })).getByText(
        'Not available',
      ),
    ).toBeInTheDocument();
  });
});

describe('MomentumChart', () => {
  it('exposes a labelled SVG and a data table with gaps marked unavailable', async () => {
    render(
      <MomentumChart
        title="Momentum"
        description="Momentum index over time"
        homeName="Home"
        awayName="Away"
        tableLabel="View as table"
        data={[
          { period: 1, clockMs: 60_000, home: null, away: null },
          { period: 1, clockMs: 120_000, home: 55.5, away: 44.5 },
        ]}
      />,
    );
    expect(screen.getByRole('img', { name: /Momentum/ })).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'View as table' }),
    );
    const table = screen.getByRole('table');
    expect(within(table).getAllByText('Not available')).toHaveLength(2);
    expect(within(table).getByText('55.5')).toBeInTheDocument();
  });
});

describe('OverlayCanvas', () => {
  it('renders active cues inside the cue safe area with the watermark', () => {
    const { container } = render(
      <OverlayCanvas
        cues={[
          cue({
            safeArea: { topPct: 8, rightPct: 6, bottomPct: 10, leftPct: 6 },
          }),
        ]}
        scorebug={null}
        watermark="Synthetic match demo"
        standbyLabel="Standing by"
        safeAreaLabel="Safe area"
        frameLabel="Overlay preview"
      />,
    );
    expect(screen.getByText('Shot burst')).toBeInTheDocument();
    expect(screen.getByText('Synthetic match demo')).toBeInTheDocument();
    const area = container.querySelector<HTMLElement>('[data-safe-area]');
    expect(area?.style.top).toBe('8%');
    expect(area?.style.bottom).toBe('10%');
  });

  it('stands by with the last aired cue when nothing is on air', () => {
    render(
      <OverlayCanvas
        cues={[]}
        scorebug={null}
        watermark="W"
        standbyLabel="Standing by"
        lastAired="Last on air: Goal for Penbrook Town"
        safeAreaLabel="Safe area"
        frameLabel="Overlay preview"
      />,
    );
    const standby = screen.getByTestId('overlay-standby');
    expect(standby).toHaveTextContent('Standing by');
    expect(standby).toHaveTextContent('Last on air: Goal for Penbrook Town');
  });

  it('hides the standby state while a cue is on air', () => {
    render(
      <OverlayCanvas
        cues={[cue()]}
        scorebug={null}
        watermark="W"
        standbyLabel="Standing by"
        lastAired="Last on air: earlier"
        safeAreaLabel="Safe area"
        frameLabel="Overlay preview"
      />,
    );
    expect(screen.queryByTestId('overlay-standby')).not.toBeInTheDocument();
  });
});

describe('ConnectionStatus', () => {
  it.each([
    ['live', 'Live'],
    ['reconnecting', 'Reconnecting…'],
    ['stale', 'Catching up'],
    ['offline', 'Offline'],
  ] as const)('labels the %s state in text', (state, label) => {
    render(<ConnectionStatus state={state} />);
    expect(screen.getByRole('status')).toHaveTextContent(label);
  });
});

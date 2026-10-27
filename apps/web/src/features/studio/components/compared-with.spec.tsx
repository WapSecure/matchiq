import { CONTEXT_REFS, type Insight } from '@matchiq/contracts';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  COMPARISON_COPY,
  COMPARISON_WINDOW_KEY,
  countNoun,
} from '@/constants/comparison';
import { insight } from '@/test/factories';
import { useComparisonWindow } from '../lib/comparison-window';
import { ComparedWith } from './compared-with';

const withContext = (overrides: Partial<Insight['evidence']> = {}): Insight => {
  const base = insight();
  return {
    ...base,
    evidence: { ...base.evidence, sampleSize: 6, ...overrides },
    context: {
      methodVersion: '1.0.0',
      side: 'home',
      scoreState: 'LEVEL',
      phase: 'FIRST_HALF',
      comparison: { metric: 'shots' },
      trend: { metric: 'shots', direction: 'RISING' },
      linked: {},
      eventIds: [],
      metrics: {
        [CONTEXT_REFS.minute]: 20,
        [CONTEXT_REFS.recent('home')]: 4,
        [CONTEXT_REFS.average('home')]: 2,
        [CONTEXT_REFS.recent('away')]: 1,
        [CONTEXT_REFS.average('away')]: 1.5,
        [CONTEXT_REFS.spells[0]]: 0,
        [CONTEXT_REFS.spells[1]]: 1,
        [CONTEXT_REFS.spells[2]]: 3,
      },
    },
  };
};

beforeEach(() => {
  localStorage.clear();
  useComparisonWindow.setState({ chosen: '10', hydrated: false });
});

describe('ComparedWith', () => {
  it('shows both teams over ten minutes with sample sizes and the limitation', () => {
    render(
      <ComparedWith
        insight={withContext({ limitations: 'Only 20 minutes played.' })}
        persona="ANALYST"
      />,
    );
    expect(screen.getAllByText(/Home: Above the match average/)).toHaveLength(
      1,
    );
    expect(screen.getByText(/4 shots in the last 10 minutes/)).toBeVisible();
    expect(
      screen.getByText(/Match average 2.0 every 10 minutes/),
    ).toBeVisible();
    expect(screen.getAllByText(/about 4 so far in the match/)).toHaveLength(1);
    expect(screen.getByText(COMPARISON_COPY.momentSample(6))).toBeVisible();
    expect(screen.getByText('Only 20 minutes played.')).toBeVisible();
    expect(
      screen.getByRole('img', { name: /Home: shots in the last three/ }),
    ).toBeVisible();
  });

  it('switches window and remembers the choice on this device', async () => {
    const user = userEvent.setup();
    render(<ComparedWith insight={withContext()} persona="ANALYST" />);
    await user.click(screen.getByRole('radio', { name: /5 min/ }));
    expect(screen.getByText(/3 shots in the last 5 minutes/)).toBeVisible();
    expect(screen.getByText(COMPARISON_COPY.fiveMinuteScope)).toBeVisible();
    expect(localStorage.getItem(COMPARISON_WINDOW_KEY)).toBe('5');
    await user.click(screen.getByRole('radio', { name: /Match/ }));
    expect(screen.getByText(/About 4 shots so far, 2.0/)).toBeVisible();
  });

  it('starts from the stored window', () => {
    localStorage.setItem(COMPARISON_WINDOW_KEY, 'match');
    render(<ComparedWith insight={withContext()} persona="ANALYST" />);
    expect(screen.getByRole('radio', { name: /Match/ })).toBeChecked();
  });

  it('says there is not enough match time when nothing was compared', () => {
    render(<ComparedWith insight={insight()} persona="ANALYST" />);
    expect(screen.getByText(COMPARISON_COPY.empty)).toBeVisible();
  });

  it('shows a placeholder while loading', () => {
    const { container } = render(
      <ComparedWith insight={insight()} persona="ANALYST" loading />,
    );
    expect(screen.queryByText(COMPARISON_COPY.empty)).not.toBeInTheDocument();
    expect(container.firstChild).toBeInTheDocument();
  });

  it.each(['CASUAL', 'BROADCAST'] as const)('is hidden from %s', (persona) => {
    const { container } = render(
      <ComparedWith insight={withContext()} persona={persona} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe('countNoun', () => {
  it.each([
    [0, 'shots'],
    [1, 'shot'],
    [2, 'shots'],
  ])('uses the right form for %i', (count, expected) => {
    expect(countNoun(count, 'shots')).toBe(expected);
    expect(COMPARISON_COPY.recent(count, 'shots', 10)).toContain(
      `${count} ${expected} in`,
    );
  });

  it('handles ball wins and pressing moments', () => {
    expect(countNoun(1, 'ball wins')).toBe('ball win');
    expect(countNoun(1, 'pressing moments')).toBe('pressing moment');
    expect(countNoun(2, 'pressing moments')).toBe('pressing moments');
    expect(COMPARISON_COPY.sample(1, 'shots', 5)).toContain('1 shot here');
  });
});

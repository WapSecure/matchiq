import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Insight, Persona } from '@matchiq/contracts';
import { insight, narrative } from '@/test/factories';
import { checkFigures, narrativeFigures } from './check-figures';
import { FiguresCheckedList } from './figures-checked-list';
import { MomentNumbersChecked } from './numbers-checked';

const base = (metrics: Record<string, number>): Insight => {
  const i = insight();
  return { ...i, evidence: { ...i.evidence, computedMetrics: metrics } };
};

const FOUR = base({
  'shots.home.rolling5m': 4,
  'pressures.home.rolling5m': 11,
});
const TEXT = narrative({
  headline: 'Home fire 4 shots',
  body: 'They won the ball back 11 times, four of them high.',
});

const show = (persona: Persona, overrides = {}) => {
  const onOpen = vi.fn();
  render(
    <MomentNumbersChecked
      insight={FOUR}
      narrative={TEXT}
      withheld={false}
      persona={persona}
      headline="Home fire 4 shots"
      onOpen={onOpen}
      {...overrides}
    />,
  );
  return onOpen;
};

describe('checkFigures', () => {
  it('matches digits and spelled-out numbers to plain stat names', () => {
    expect(narrativeFigures(FOUR, TEXT)).toEqual([
      { shown: '4', stat: expect.stringContaining('Shots') },
      { shown: '11', stat: expect.stringContaining('Pressures') },
      { shown: 'four', stat: expect.stringContaining('Shots') },
    ]);
  });

  it('claims nothing when wording has no figures', () => {
    expect(
      narrativeFigures(FOUR, narrative({ headline: 'Pressure', body: 'Ok.' })),
    ).toBeNull();
  });

  it('claims nothing when one figure matches no stat', () => {
    expect(
      checkFigures(FOUR, { texts: ['4 shots and 9 corners'], locale: 'en-GB' }),
    ).toBeNull();
  });

  it('claims nothing for a language it cannot read', () => {
    expect(
      checkFigures(FOUR, { texts: ['4 tirs'], locale: 'fr-FR' }),
    ).toBeNull();
  });
});

describe('NumbersChecked', () => {
  it('gives the analyst the count and a link that opens the evidence', async () => {
    const onOpen = show('ANALYST');
    const button = screen.getByRole('button', {
      name: /All 3 figures match the match data/,
    });
    expect(button).toHaveTextContent('All 3 figures match the match data');
    await userEvent.click(button);
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it('gives fans one reassurance line with the count for screen readers', () => {
    show('CASUAL');
    expect(
      screen.getByText(/Numbers checked against the match data/),
    ).toBeInTheDocument();
    expect(
      screen.getByText('All 3 figures match the match data'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('gives the broadcaster a quiet tick', () => {
    show('BROADCAST');
    expect(screen.getByText('Checked')).toBeInTheDocument();
    expect(screen.getByText('All 3 figures match the match data')).toHaveClass(
      'sr-only',
    );
  });

  it('says nothing for retracted or suppressed moments', () => {
    const { container } = render(
      <MomentNumbersChecked
        insight={FOUR}
        narrative={TEXT}
        withheld
        persona="ANALYST"
        headline="x"
        onOpen={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('says nothing, not "0 of 0", without figures or wording', () => {
    const { container } = render(
      <MomentNumbersChecked
        insight={FOUR}
        narrative={null}
        withheld={false}
        persona="ANALYST"
        headline="x"
        onOpen={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('uses no technical words', () => {
    show('ANALYST');
    expect(document.body.textContent).not.toMatch(
      /\b(gate|metricRef|citedValues|schema|AI|model|template)\b/i,
    );
  });
});

describe('FiguresCheckedList', () => {
  it('lists each figure with the stat it matched', () => {
    render(<FiguresCheckedList insight={FOUR} narrative={TEXT} />);
    expect(
      screen.getByRole('heading', { name: 'Figures checked' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByText('11')).toBeInTheDocument();
    expect(screen.getByText(/Pressures/)).toBeInTheDocument();
  });

  it('renders nothing when no claim can be made', () => {
    const { container } = render(
      <FiguresCheckedList insight={FOUR} narrative={null} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

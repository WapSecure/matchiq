import { act, render, screen } from '@testing-library/react';
import { STUDIO_UI_DEFAULTS, useStudioUi } from '@/features/studio/store';
import { RECAP_COPY } from '@/constants/recap';
import { available, fixture, snapshot } from '@/test/factories';
import { moment, recap } from '@/test/session-factories';
import { RecapStory } from './recap-story';

const finalWith = (home: number, away: number) => {
  const base = snapshot({ phase: 'COMPLETED', period: 2 });
  return snapshot({
    phase: 'COMPLETED',
    period: 2,
    home: { ...base.home, possessionPct: available(home) },
    away: { ...base.away, possessionPct: available(away) },
  });
};

describe('recap story facts', () => {
  it('splits possession like Final stats, so it adds up to 100%', () => {
    render(
      <RecapStory
        recap={recap({ finalSnapshot: finalWith(48.5, 51.5) })}
        fixture={fixture()}
      />,
    );
    expect(
      screen.getByText(RECAP_COPY.facts.possession('49%', '51%')),
    ).toBeInTheDocument();
  });

  it('shows a dash when possession is not available', () => {
    const base = finalWith(50, 50);
    const missing = {
      ...base,
      home: {
        ...base.home,
        possessionPct: { status: 'unavailable', reason: 'NOT_GENERATED' },
      },
    } as const;
    render(
      <RecapStory
        recap={recap({ finalSnapshot: missing })}
        fixture={fixture()}
      />,
    );
    const dash = RECAP_COPY.facts.missing;
    expect(
      screen.getByText(RECAP_COPY.facts.possession(dash, dash)),
    ).toBeInTheDocument();
  });
});

describe('recap headline wording', () => {
  const narrative = (persona: 'CASUAL' | 'ANALYST', body: string) => ({
    persona,
    locale: 'en-GB' as const,
    headline: persona === 'CASUAL' ? 'Late winner' : 'Goal',
    body,
    source: 'TEMPLATE' as const,
    localeFallback: false,
    citations: ['ev_3'],
  });

  it('stays in plain words even when the analyst audience is chosen', () => {
    act(() => useStudioUi.setState({ persona: 'ANALYST' }));
    render(
      <RecapStory
        recap={recap({
          keyMoments: [
            moment({
              narratives: [
                narrative(
                  'ANALYST',
                  'Rolling-window shots: 1. Confidence: high.',
                ),
                narrative('CASUAL', 'Jason Netheby scores in the 89th minute.'),
              ],
            }),
          ],
        })}
        fixture={fixture()}
      />,
    );
    expect(screen.getByText(/scores in the 89th minute/)).toBeInTheDocument();
    expect(screen.queryByText(/Rolling-window/)).not.toBeInTheDocument();
    act(() => useStudioUi.setState({ ...STUDIO_UI_DEFAULTS }));
  });
});

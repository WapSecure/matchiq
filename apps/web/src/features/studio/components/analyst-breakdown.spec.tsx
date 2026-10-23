import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BREAKDOWN_COPY } from '@/constants/match';
import { insight, narrative } from '@/test/factories';
import { breakdown } from '@/test/session-factories';
import { NarrativePanel } from './narrative-panel';

const parts = breakdown();
const languageOf = (element: HTMLElement) =>
  element.closest('[lang]')?.getAttribute('lang');

const renderPanel = (withBreakdown: boolean) =>
  render(
    <NarrativePanel
      persona="ANALYST"
      insight={insight()}
      locale="fr-FR"
      view={{
        narrative: narrative({
          persona: 'ANALYST',
          locale: 'fr-FR',
          headline: 'La pression monte',
          breakdown: withBreakdown ? parts : undefined,
        }),
        localeFallback: false,
      }}
    />,
  );

describe('analyst breakdown', () => {
  it('opens on what happened and replaces the plain write-up', () => {
    renderPanel(true);
    expect(
      screen.getByRole('heading', { name: BREAKDOWN_COPY.parts.whatHappened }),
    ).toBeVisible();
    expect(screen.getByText(parts.whatHappened.text)).toBeVisible();
    expect(languageOf(screen.getByText(parts.whatHappened.text))).toBe('fr-FR');
    expect(
      languageOf(screen.getByText(BREAKDOWN_COPY.parts.whatHappened)),
    ).toBe('en-GB');
    expect(screen.getByText(parts.whyItMatters.text)).not.toBeVisible();
    expect(screen.getByText(parts.whatToWatch.text)).not.toBeVisible();
    expect(
      screen.queryByText('Three shots in five minutes.'),
    ).not.toBeInTheDocument();
    expect(screen.getByText('La pression monte')).toBeInTheDocument();
  });

  it('expands to the full breakdown and collapses again', async () => {
    const user = userEvent.setup();
    renderPanel(true);
    const toggle = screen.getByRole('button', { name: BREAKDOWN_COPY.expand });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveAccessibleName(BREAKDOWN_COPY.collapse);
    expect(toggle).toHaveFocus();
    expect(
      screen.getByRole('heading', { name: BREAKDOWN_COPY.parts.whyItMatters }),
    ).toBeVisible();
    expect(screen.getByText(parts.whatToWatch.text)).toBeVisible();
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText(parts.whyItMatters.text)).not.toBeVisible();
  });

  it('shows the write-up as before when there is no breakdown', () => {
    renderPanel(false);
    expect(
      screen.getByText('Three shots in five minutes.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: BREAKDOWN_COPY.expand }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(BREAKDOWN_COPY.parts.whatHappened),
    ).not.toBeInTheDocument();
  });
});

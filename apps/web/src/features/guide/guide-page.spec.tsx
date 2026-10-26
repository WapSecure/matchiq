import { render, screen, within } from '@testing-library/react';
import { GUIDE_STEPS } from '@/constants/guide';
import { GuidePage } from './guide-page';

describe('GuidePage', () => {
  it('lists every step in order under one page heading', () => {
    render(<GuidePage />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'A three-minute tour' }),
    ).toBeInTheDocument();
    const items = within(
      screen.getByRole('list', { name: 'Tour steps' }),
    ).getAllByRole('listitem');
    expect(items).toHaveLength(GUIDE_STEPS.length);
    expect(GUIDE_STEPS.length).toBeGreaterThanOrEqual(6);
    GUIDE_STEPS.forEach((step, i) => {
      const item = within(items[i] as HTMLElement);
      expect(
        item.getByRole('heading', { level: 2, name: step.title }),
      ).toBeInTheDocument();
      expect(item.getByText(step.doThis)).toBeInTheDocument();
      expect(item.getByText(step.shows)).toBeInTheDocument();
    });
  });

  it('only links to routes that exist without a session', () => {
    render(<GuidePage />);
    const hrefs = screen
      .getAllByRole('link')
      .map((a) => a.getAttribute('href'));
    expect(hrefs.length).toBeGreaterThan(0);
    hrefs.forEach((href) => expect(['/fixtures', '/sign-in']).toContain(href));
  });

  it('does not claim a cloud model service or show the demo password', () => {
    render(<GuidePage />);
    expect(document.body.textContent).not.toMatch(
      /foundry|azure|matchiq-dev-only/i,
    );
  });
});

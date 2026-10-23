import { render, screen, within } from '@testing-library/react';
import { PIPELINE } from '@/constants/landing';
import { SYNTHETIC_DISCLOSURE } from '@/constants/site';
import LandingPage from './page';

describe('LandingPage', () => {
  beforeEach(() => render(<LandingPage />));

  it('has a single top-level heading', () => {
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('discloses that match data is synthetic', () => {
    const note = screen.getByRole('note');
    expect(
      within(note).getByText(SYNTHETIC_DISCLOSURE.label),
    ).toBeInTheDocument();
  });

  it('identifies the static product shot as a sample', () => {
    expect(screen.getByText('Sample preview')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Choose a match' }),
    ).toHaveAttribute('href', '/fixtures');
  });

  it('lists every pipeline stage in order', () => {
    const list = screen
      .getByRole('region', { name: PIPELINE.title })
      .querySelector('ol');
    const titles = within(list as HTMLElement)
      .getAllByRole('heading', { level: 3 })
      .map((h) => h.textContent);
    expect(titles).toEqual(PIPELINE.stages.map((s) => s.title));
  });

  it('provides a skip link to the main landmark', () => {
    expect(
      screen.getByRole('link', { name: 'Skip to content' }),
    ).toHaveAttribute('href', '#main-content');
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
  });
});

import { render, screen } from '@testing-library/react';
import { LogoMark } from './logo-mark';

describe('IconBase', () => {
  it('hides decorative icons from assistive technology', () => {
    const { container } = render(<LogoMark />);
    expect(container.querySelector('svg')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  });

  it('exposes titled icons as images with an accessible name', () => {
    render(<LogoMark title="MatchIQ" />);
    expect(screen.getByRole('img', { name: 'MatchIQ' })).toBeInTheDocument();
  });

  it('applies the requested size', () => {
    const { container } = render(<LogoMark size={32} />);
    expect(container.querySelector('svg')).toHaveAttribute('width', '32');
  });
});

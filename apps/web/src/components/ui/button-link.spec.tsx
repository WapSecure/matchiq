import { render, screen } from '@testing-library/react';
import { ButtonLink } from './button-link';

describe('ButtonLink', () => {
  it('opens external links safely in a new tab', () => {
    render(
      <ButtonLink href="https://example.com" external>
        Source
      </ButtonLink>,
    );
    const link = screen.getByRole('link', { name: 'Source' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('keeps internal links in the same tab', () => {
    render(<ButtonLink href="#pipeline">Pipeline</ButtonLink>);
    expect(screen.getByRole('link', { name: 'Pipeline' })).not.toHaveAttribute(
      'target',
    );
  });
});

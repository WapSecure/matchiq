import { fireEvent, render, screen } from '@testing-library/react';
import { BackLink } from './back-link';

const setReferrer = (value: string) =>
  Object.defineProperty(document, 'referrer', { value, configurable: true });

describe('BackLink', () => {
  afterEach(() => {
    setReferrer('');
    vi.restoreAllMocks();
  });

  it('is a plain link to the home page by default', () => {
    render(<BackLink />);
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute(
      'href',
      '/',
    );
  });

  it('goes back in history when the previous page was on this site', () => {
    setReferrer(`${window.location.origin}/fixtures`);
    vi.spyOn(window.history, 'length', 'get').mockReturnValue(2);
    const back = vi.spyOn(window.history, 'back').mockReturnValue(undefined);
    render(<BackLink fallbackHref="/fixtures" />);
    fireEvent.click(screen.getByRole('link', { name: 'Back' }));
    expect(back).toHaveBeenCalledOnce();
  });

  it('follows the fallback link when the visitor came from elsewhere', () => {
    setReferrer('https://elsewhere.example/');
    const back = vi.spyOn(window.history, 'back').mockReturnValue(undefined);
    render(<BackLink />);
    fireEvent.click(screen.getByRole('link', { name: 'Back' }));
    expect(back).not.toHaveBeenCalled();
  });
});

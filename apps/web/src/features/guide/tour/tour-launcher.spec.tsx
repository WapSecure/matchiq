import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TOUR_STORAGE_KEY } from '@/constants/guide';
import { TourLauncher } from './tour-launcher';

const mountRegions = () => {
  document.body.insertAdjacentHTML(
    'beforeend',
    '<section aria-label="Scoreboard"></section><div data-tour="audience"></div>',
  );
};

describe('TourLauncher', () => {
  afterEach(() => {
    document
      .querySelectorAll('[aria-label="Scoreboard"], [data-tour]')
      .forEach((el) => el.remove());
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('never opens by itself', () => {
    mountRegions();
    render(<TourLauncher />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('steps forward and back, skipping regions that are not on screen', async () => {
    mountRegions();
    const user = userEvent.setup();
    render(<TourLauncher />);
    await user.click(screen.getByRole('button', { name: 'Take the tour' }));
    expect(screen.getByRole('dialog', { name: 'Studio tour' })).toHaveFocus();
    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
    expect(screen.getByText('Score and graphics preview')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Audience and language')).toBeInTheDocument();
    expect(document.querySelector('[data-tour-active]')).toHaveAttribute(
      'data-tour',
      'audience',
    );
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
  });

  it('closes with Escape, returns focus and remembers it', async () => {
    mountRegions();
    const user = userEvent.setup();
    render(<TourLauncher />);
    await user.click(screen.getByRole('button', { name: 'Take the tour' }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(window.localStorage.getItem(TOUR_STORAGE_KEY)).toBe('dismissed');
    expect(
      screen.getByRole('button', { name: 'Take the tour again' }),
    ).toHaveFocus();
    expect(document.querySelector('[data-tour-active]')).toBeNull();
  });

  it('keeps the quiet button after a dismissal', async () => {
    window.localStorage.setItem(TOUR_STORAGE_KEY, 'dismissed');
    render(<TourLauncher />);
    expect(
      await screen.findByRole('button', { name: 'Take the tour again' }),
    ).toBeInTheDocument();
  });

  it('still works when storage is blocked', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const user = userEvent.setup();
    render(<TourLauncher />);
    await user.click(screen.getByRole('button', { name: 'Take the tour' }));
    await user.click(screen.getByRole('button', { name: 'Close the tour' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('says so when nothing can be pointed at', async () => {
    const user = userEvent.setup();
    render(<TourLauncher />);
    await user.click(screen.getByRole('button', { name: 'Take the tour' }));
    expect(screen.getByText(/Nothing to point at yet/)).toBeInTheDocument();
  });
});

import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type * as pwa from '@/constants/pwa';
import { PWA_COPY } from '@/constants/pwa';
import { PwaPrompts } from './pwa-prompts';

vi.mock('@/constants/pwa', async (importOriginal) => ({
  ...(await importOriginal<typeof pwa>()),
  PWA_ENABLED: true,
}));

describe('PwaPrompts', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as never;
  });

  it('renders nothing until an install prompt or update applies', () => {
    render(<PwaPrompts />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('offers an accessible install button that can be dismissed', async () => {
    render(<PwaPrompts />);
    const event = Object.assign(
      new Event('beforeinstallprompt', { cancelable: true }),
      {
        prompt: vi.fn(() => Promise.resolve()),
        userChoice: Promise.resolve({ outcome: 'dismissed' }),
      },
    );
    act(() => {
      window.dispatchEvent(event);
    });
    const region = screen.getByRole('region', {
      name: PWA_COPY.install.region,
    });
    expect(region).toContainElement(
      screen.getByRole('button', { name: PWA_COPY.install.action }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: PWA_COPY.install.dismiss }),
    );
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });
});

import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { THEME_ATTRIBUTE, THEME_STORAGE_KEY } from '@/constants/theme';
import { THEME_INIT_SCRIPT } from './theme-script';
import { readPreference, resolveTheme, setPreference } from './theme-store';

const root = () => document.documentElement;

const stubScheme = (dark: boolean) => {
  const listeners = new Set<() => void>();
  const media = {
    matches: dark,
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
  };
  window.matchMedia = vi.fn().mockReturnValue(media) as never;
  return {
    flip: (next: boolean) => {
      media.matches = next;
      listeners.forEach((fn) => fn());
    },
  };
};

const runInitScript = () => new Function(THEME_INIT_SCRIPT)();

describe('theme', () => {
  beforeEach(() => {
    window.localStorage.clear();
    root().removeAttribute(THEME_ATTRIBUTE);
    stubScheme(false);
  });

  describe('no-flash init script', () => {
    it.each(['light', 'dark'] as const)(
      'applies a stored %s choice before paint',
      (theme) => {
        window.localStorage.setItem(THEME_STORAGE_KEY, theme);
        runInitScript();
        expect(root()).toHaveAttribute(THEME_ATTRIBUTE, theme);
      },
    );

    it('leaves the OS preference in charge without a valid choice', () => {
      root().setAttribute(THEME_ATTRIBUTE, 'dark');
      window.localStorage.setItem(THEME_STORAGE_KEY, 'sepia');
      runInitScript();
      expect(root()).not.toHaveAttribute(THEME_ATTRIBUTE);
    });

    it('survives storage that throws', () => {
      const spy = vi
        .spyOn(Storage.prototype, 'getItem')
        .mockImplementation(() => {
          throw new Error('blocked');
        });
      expect(runInitScript).not.toThrow();
      spy.mockRestore();
    });

    it('is self-contained so it can be inlined in <head>', () => {
      expect(THEME_INIT_SCRIPT).toContain(JSON.stringify(THEME_STORAGE_KEY));
      expect(THEME_INIT_SCRIPT.startsWith('(')).toBe(true);
    });
  });

  describe('store', () => {
    it('persists explicit choices and clears them for system', () => {
      setPreference('dark');
      expect(root()).toHaveAttribute(THEME_ATTRIBUTE, 'dark');
      expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
      expect(readPreference()).toBe('dark');
      setPreference('system');
      expect(root()).not.toHaveAttribute(THEME_ATTRIBUTE);
      expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
      expect(readPreference()).toBe('system');
    });

    it('resolves system from prefers-color-scheme', () => {
      stubScheme(true);
      expect(resolveTheme('system')).toBe('dark');
      expect(resolveTheme('light')).toBe('light');
      stubScheme(false);
      expect(resolveTheme('system')).toBe('light');
    });
  });

  describe('ThemeToggle', () => {
    it('offers light, dark and system as a labelled radio group', async () => {
      const user = userEvent.setup();
      render(<ThemeToggle />);
      const group = screen.getByRole('group', { name: 'Colour theme' });
      expect(group).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: 'System' })).toBeChecked();
      await user.click(screen.getByRole('radio', { name: 'Dark' }));
      expect(root()).toHaveAttribute(THEME_ATTRIBUTE, 'dark');
      expect(screen.getByRole('radio', { name: 'Dark' })).toBeChecked();
    });

    it('cycles from the compact button and names the next theme', async () => {
      const user = userEvent.setup();
      render(<ThemeToggle />);
      await user.click(
        screen.getByRole('button', {
          name: 'Colour theme: System. Switch to Light',
        }),
      );
      expect(root()).toHaveAttribute(THEME_ATTRIBUTE, 'light');
      expect(
        screen.getByRole('button', { name: /Light. Switch to Dark/ }),
      ).toBeInTheDocument();
    });

    it('re-renders when another tab changes the choice', () => {
      render(<ThemeToggle />);
      act(() => {
        window.localStorage.setItem(THEME_STORAGE_KEY, 'light');
        window.dispatchEvent(new StorageEvent('storage'));
      });
      expect(screen.getByRole('radio', { name: 'Light' })).toBeChecked();
    });
  });
});

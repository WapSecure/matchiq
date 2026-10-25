import { create } from 'zustand';
import {
  COMPARISON_WINDOW_KEY,
  COMPARISON_WINDOWS,
  DEFAULT_COMPARISON_WINDOW,
  type ComparisonWindow,
} from '@/constants/comparison';

const isWindow = (value: unknown): value is ComparisonWindow =>
  COMPARISON_WINDOWS.some((w) => w === value);

export const readStoredWindow = (): ComparisonWindow => {
  try {
    const raw = globalThis.localStorage.getItem(COMPARISON_WINDOW_KEY);
    return isWindow(raw) ? raw : DEFAULT_COMPARISON_WINDOW;
  } catch {
    return DEFAULT_COMPARISON_WINDOW;
  }
};

type WindowState = {
  chosen: ComparisonWindow;
  hydrated: boolean;
  choose: (next: ComparisonWindow) => void;
  hydrate: () => void;
};

export const useComparisonWindow = create<WindowState>()((set, get) => ({
  chosen: DEFAULT_COMPARISON_WINDOW,
  hydrated: false,
  choose: (next) => {
    set({ chosen: next, hydrated: true });
    try {
      globalThis.localStorage.setItem(COMPARISON_WINDOW_KEY, next);
    } catch {
      /* The choice still applies for this page view. */
    }
  },
  hydrate: () => {
    if (get().hydrated) return;
    set({ chosen: readStoredWindow(), hydrated: true });
  },
}));

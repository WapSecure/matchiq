'use client';

import { useSyncExternalStore } from 'react';
import { PAGINATION_URL } from '@/constants/pagination';

export type UrlParamUpdates = Readonly<Record<string, string | null>>;

const subscribe = (onChange: () => void) => {
  window.addEventListener('popstate', onChange);
  window.addEventListener(PAGINATION_URL.changeEvent, onChange);
  return () => {
    window.removeEventListener('popstate', onChange);
    window.removeEventListener(PAGINATION_URL.changeEvent, onChange);
  };
};

/**
 * Writes query parameters with a history entry, so a paged view can be shared
 * and Back returns to the previous page. Next.js keeps its router in step with
 * `history.pushState`; `null` removes a parameter.
 */
export const setUrlParams = (
  updates: UrlParamUpdates,
  mode: 'push' | 'replace' = 'push',
): void => {
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries(updates)) {
    if (value === null) url.searchParams.delete(key);
    else url.searchParams.set(key, value);
  }
  if (url.href === window.location.href) return;
  if (mode === 'push') window.history.pushState(null, '', url);
  else window.history.replaceState(null, '', url);
  window.dispatchEvent(new Event(PAGINATION_URL.changeEvent));
};

/** One query parameter, live across pushes and Back; `null` on the server and when absent. */
export const useUrlParam = (key: string): string | null =>
  useSyncExternalStore(
    subscribe,
    () => new URLSearchParams(window.location.search).get(key),
    () => null,
  );

/** A positive integer parameter such as `?page=2`, falling back when absent or malformed. */
export const usePositiveIntParam = (key: string, fallback: number): number => {
  const raw = useUrlParam(key);
  const value = raw === null ? Number.NaN : Number(raw);
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
};

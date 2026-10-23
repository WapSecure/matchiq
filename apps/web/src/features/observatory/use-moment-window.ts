import { type MouseEvent, useEffect, useState } from 'react';
import { MOMENTS_PAGE_SIZE } from '@/constants/fact-checks';
import type { InsightTrace } from '@/lib/api/trace-schemas';
import { momentAnchor } from './trace-card';

const ANCHOR = '#moment-';

/**
 * Client-side window over the filtered moments. A strip link to a moment that
 * is not rendered yet widens the window to include it, then scrolls to it.
 */
export function useMomentWindow(
  shown: readonly InsightTrace[],
  filterKey: string,
) {
  const [state, setState] = useState({ filterKey, limit: MOMENTS_PAGE_SIZE });
  const [target, setTarget] = useState<string | null>(null);
  const limit = state.filterKey === filterKey ? state.limit : MOMENTS_PAGE_SIZE;
  const visible = shown.slice(0, limit);

  useEffect(() => {
    if (target === null) return;
    const el = document.getElementById(momentAnchor(target));
    if (!el) return;
    el.scrollIntoView({ block: 'start' });
    el.focus({ preventScroll: true });
    setTarget(null);
  }, [target, visible.length]);

  const widen = (to: number) =>
    setState({ filterKey, limit: Math.max(limit, to) });

  const onJump = (event: MouseEvent) => {
    const link = (event.target as HTMLElement).closest('a[href^="#moment-"]');
    if (!link) return;
    const id = (link.getAttribute('href') ?? '').slice(ANCHOR.length);
    const index = shown.findIndex((t) => t.insightId === id);
    if (index < 0) return;
    event.preventDefault();
    widen(Math.ceil((index + 1) / MOMENTS_PAGE_SIZE) * MOMENTS_PAGE_SIZE);
    setTarget(id);
  };

  return {
    visible,
    hasMore: visible.length < shown.length,
    loadMore: () => widen(limit + MOMENTS_PAGE_SIZE),
    onJump,
  };
}

interface Step {
  readonly previous: string | null;
  /** Items before this page, when the walk that reached it is known. */
  readonly offset: number | null;
}

/**
 * The stack of cursors a list was walked through, so Previous works on a
 * forward-only API. Each cursor remembers the one before it, which survives
 * Back, Forward and reloads of the same tab better than a single array: any
 * page in the trail knows its own way back. A cursor opened from a shared link
 * has no trail, so Previous returns to the first page.
 */
export class CursorTrail {
  private readonly steps = new Map<string, Step>();

  /** Records that `next` follows the page at `current`, which showed `count` items. */
  record(current: string | null, count: number, next: string): void {
    const offset = this.offsetOf(current);
    this.steps.set(next, {
      previous: current,
      offset: offset === null ? null : offset + count,
    });
  }

  previousOf(cursor: string | null): string | null {
    if (cursor === null) return null;
    return this.steps.get(cursor)?.previous ?? null;
  }

  offsetOf(cursor: string | null): number | null {
    if (cursor === null) return 0;
    return this.steps.get(cursor)?.offset ?? null;
  }
}

const trails = new Map<string, CursorTrail>();

/** One trail per list for the life of the tab, so leaving and returning keeps it. */
export const cursorTrailFor = (list: string): CursorTrail => {
  const known = trails.get(list);
  if (known) return known;
  const trail = new CursorTrail();
  trails.set(list, trail);
  return trail;
};

import { CursorTrail } from './cursor-trail';
import { clampPage, pageItems, rangeOf, totalPagesOf } from './page-range';

describe('pageItems', () => {
  it('lists every page when they fit', () => {
    expect(pageItems(1, 1)).toEqual([1]);
    expect(pageItems(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it.each([
    [1, [1, 2, 3, 4, 5, 'gap-end', 12]],
    [4, [1, 2, 3, 4, 5, 'gap-end', 12]],
    [5, [1, 'gap-start', 4, 5, 6, 'gap-end', 12]],
    [8, [1, 'gap-start', 7, 8, 9, 'gap-end', 12]],
    [9, [1, 'gap-start', 8, 9, 10, 11, 12]],
    [12, [1, 'gap-start', 8, 9, 10, 11, 12]],
  ])('truncates page %i of 12 with a constant slot count', (page, items) => {
    expect(pageItems(page, 12)).toEqual(items);
    expect(pageItems(page, 12)).toHaveLength(7);
  });

  it('never hides a single page behind a gap', () => {
    expect(pageItems(4, 8)).toEqual([1, 2, 3, 4, 5, 'gap-end', 8]);
    expect(pageItems(5, 8)).toEqual([1, 'gap-start', 4, 5, 6, 7, 8]);
  });

  it('clamps an out-of-range page', () => {
    expect(pageItems(99, 12)).toEqual(pageItems(12, 12));
    expect(clampPage(0, 3)).toBe(1);
    expect(clampPage(7, 3)).toBe(3);
    expect(clampPage(Number.NaN, 3)).toBe(1);
  });
});

describe('rangeOf and totalPagesOf', () => {
  it('reports a 1-based inclusive range', () => {
    expect(rangeOf(2, 8, 23)).toEqual({ from: 9, to: 16 });
    expect(rangeOf(3, 8, 23)).toEqual({ from: 17, to: 23 });
    expect(rangeOf(1, 8, 0)).toEqual({ from: 0, to: 0 });
  });

  it('counts at least one page', () => {
    expect(totalPagesOf(23, 8)).toBe(3);
    expect(totalPagesOf(24, 8)).toBe(3);
    expect(totalPagesOf(0, 8)).toBe(1);
  });
});

describe('CursorTrail', () => {
  it('walks back through the cursors it followed, with offsets', () => {
    const trail = new CursorTrail();
    trail.record(null, 8, 'c1');
    trail.record('c1', 8, 'c2');
    expect(trail.offsetOf(null)).toBe(0);
    expect(trail.offsetOf('c1')).toBe(8);
    expect(trail.offsetOf('c2')).toBe(16);
    expect(trail.previousOf('c2')).toBe('c1');
    expect(trail.previousOf('c1')).toBeNull();
  });

  it('sends an unknown cursor back to the first page with no offset', () => {
    const trail = new CursorTrail();
    expect(trail.previousOf('shared')).toBeNull();
    expect(trail.offsetOf('shared')).toBeNull();
    trail.record('shared', 8, 'c3');
    expect(trail.previousOf('c3')).toBe('shared');
    expect(trail.offsetOf('c3')).toBeNull();
  });
});

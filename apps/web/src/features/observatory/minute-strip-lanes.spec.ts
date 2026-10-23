import { assignLanes } from './minute-strip-lanes';

describe('assignLanes', () => {
  it('keeps well-spaced markers on the line', () => {
    expect(assignLanes([5, 20, 45], 90)).toEqual([0, 0, 0]);
  });

  it('stacks markers at the same minute, in input order of arrival', () => {
    expect(assignLanes([23, 23, 23], 90)).toEqual([0, 1, 2]);
  });

  it('reuses the line once a marker has moved clear', () => {
    expect(assignLanes([23, 23.5, 40], 90)).toEqual([0, 1, 0]);
  });

  it('caps the stack at three lanes', () => {
    expect(Math.max(...assignLanes([10, 10, 10, 10, 10], 90))).toBe(2);
  });
});

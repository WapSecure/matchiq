import { placePanel } from './place-panel';

const panel = { width: 384, height: 171 };
const viewport = { width: 1280, height: 800 };
const anchor = (top: number, right: number) => ({
  top,
  bottom: top + 32,
  left: right - 40,
  right,
});

const expectInside = (
  p: { top: number; left: number },
  vp: { width: number; height: number },
) => {
  expect(p.top).toBeGreaterThanOrEqual(8);
  expect(p.left).toBeGreaterThanOrEqual(8);
  expect(p.top + panel.height).toBeLessThanOrEqual(vp.height - 8);
  expect(p.left + panel.width).toBeLessThanOrEqual(vp.width - 8);
};

describe('placePanel', () => {
  it('opens below the anchor when there is room', () => {
    const p = placePanel(anchor(100, 1000), panel, viewport);
    expect(p).toEqual({ top: 140, left: 616 });
    expectInside(p, viewport);
  });

  it('opens above when there is no room below', () => {
    const p = placePanel(anchor(700, 1000), panel, viewport);
    expect(p.top).toBe(700 - 8 - 171);
    expectInside(p, viewport);
  });

  it('pins inside the viewport when there is room neither above nor below', () => {
    const vp = { width: 1280, height: 220 };
    expectInside(placePanel(anchor(100, 1000), panel, vp), vp);
  });

  it('stays inside near the right edge', () => {
    const p = placePanel(anchor(100, 1290), panel, viewport);
    expect(p.left).toBe(1280 - 384 - 8);
    expectInside(p, viewport);
  });

  it('stays inside near the left edge', () => {
    expect(placePanel(anchor(100, 60), panel, viewport).left).toBe(8);
  });

  it('never goes off the top or left on a tiny viewport', () => {
    const vp = { width: 300, height: 120 };
    expect(placePanel(anchor(10, 290), panel, vp)).toEqual({ top: 8, left: 8 });
  });
});

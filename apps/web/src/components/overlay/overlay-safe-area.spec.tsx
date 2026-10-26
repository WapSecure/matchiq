import { render } from '@testing-library/react';
import { cue } from '@/test/factories';
import { DEFAULT_SAFE_AREA, OverlayCanvas } from './overlay-canvas';

const frame = (cues: Parameters<typeof cue>[0][]) =>
  render(
    <OverlayCanvas
      cues={cues.map((c) => cue(c))}
      scorebug={null}
      watermark="Synthetic match demo"
      standbyLabel="Standing by"
      safeAreaLabel="Safe area"
      frameLabel="Overlay preview"
    />,
  ).container.querySelector<HTMLElement>('[data-safe-area]');

describe('overlay safe area', () => {
  it('insets the cue region by all four percentages on the cue', () => {
    const area = frame([
      { safeArea: { topPct: 8, rightPct: 6, bottomPct: 10, leftPct: 4 } },
    ]);
    expect(area?.style.top).toBe('8%');
    expect(area?.style.right).toBe('6%');
    expect(area?.style.bottom).toBe('10%');
    expect(area?.style.left).toBe('4%');
  });

  it('keeps the cue and the watermark inside the safe-area box', () => {
    const area = frame([
      { safeArea: { topPct: 12, rightPct: 12, bottomPct: 12, leftPct: 12 } },
    ]);
    expect(area).toHaveTextContent('Shot burst');
    expect(area).toHaveTextContent('Synthetic match demo');
  });

  it('falls back to the action-safe default when nothing is on air', () => {
    const area = frame([]);
    expect(DEFAULT_SAFE_AREA).toEqual({
      topPct: 5,
      rightPct: 5,
      bottomPct: 5,
      leftPct: 5,
    });
    expect(area?.style.top).toBe('5%');
    expect(area?.style.left).toBe('5%');
  });
});

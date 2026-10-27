import { render } from '@testing-library/react';
import {
  DEFAULT_PITCH,
  PITCH_VIEW_PAD_M,
  pitchViewBox,
} from '@/constants/pitch';
import { PitchPlot } from './pitch-plot';

const { lengthM, widthM } = DEFAULT_PITCH;

describe('pitch view box', () => {
  it('pads every side so marks on the touchline are not clipped', () => {
    const pad = PITCH_VIEW_PAD_M;
    expect(pitchViewBox(lengthM, widthM)).toBe(
      `${-pad} ${-pad} ${lengthM + 2 * pad} ${widthM + 2 * pad}`,
    );
  });

  it('draws the plot into the padded box', () => {
    const { container } = render(
      <PitchPlot
        marks={[]}
        length={lengthM}
        width={widthM}
        title="Pitch"
        description="Marks on a pitch"
      />,
    );
    expect(container.querySelector('svg')).toHaveAttribute(
      'viewBox',
      pitchViewBox(lengthM, widthM),
    );
  });
});

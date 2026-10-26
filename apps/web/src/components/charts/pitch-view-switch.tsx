'use client';

import { SegmentedControl } from '@/components/ui/segmented-control';
import {
  DEPTH_COPY,
  PITCH_VIEWS,
  type PitchView,
} from '@/constants/pitch-depth';

const OPTIONS = PITCH_VIEWS.map((value) => ({
  value,
  label: DEPTH_COPY.views[value],
}));

type PitchViewSwitchProps = {
  value: PitchView;
  onChange: (view: PitchView) => void;
};

/** Events, Shots or Passes; sits in the panel header so the map keeps its height. */
export function PitchViewSwitch({ value, onChange }: PitchViewSwitchProps) {
  return (
    <SegmentedControl<PitchView>
      legend={DEPTH_COPY.viewLegend}
      hideLegend
      options={OPTIONS}
      value={value}
      onChange={onChange}
    />
  );
}

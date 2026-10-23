'use client';

import { REPLAY_SPEEDS, ReplaySpeed } from '@matchiq/contracts';
import { ClockIcon } from '@/components/icons';
import { type ChoiceOption, Select } from '@/components/ui';
import {
  REPLAY_SPEED_CHOICES,
  speedChoiceLabel,
} from '@/constants/control-options';
import { LOBBY_COPY } from '@/constants/lobby';

const OPTIONS: ChoiceOption[] = REPLAY_SPEEDS.map((speed) => ({
  id: String(speed),
  label: speedChoiceLabel(speed),
  description: REPLAY_SPEED_CHOICES[speed].description,
  icon: <ClockIcon size={15} />,
}));

type SpeedSelectProps = {
  title: string;
  value: ReplaySpeed;
  onChange: (speed: ReplaySpeed) => void;
};

/** Replay speed as option cards that say how long the match will take. */
export function SpeedSelect({ title, value, onChange }: SpeedSelectProps) {
  return (
    <Select
      label={LOBBY_COPY.speedFor(title)}
      hideLabel
      value={String(value)}
      onChange={(id) => {
        const parsed = ReplaySpeed.safeParse(Number(id));
        if (parsed.success) onChange(parsed.data);
      }}
      options={OPTIONS}
      popoverWidth="wide"
      className="min-w-40"
    />
  );
}

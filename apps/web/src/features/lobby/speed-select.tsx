'use client';

import { REPLAY_SPEEDS, ReplaySpeed } from '@matchiq/contracts';
import { ClockIcon } from '@/components/icons';
import { type ChoiceOption, Select } from '@/components/ui';
import {
  REPLAY_SPEED_CHOICES,
  speedChoiceLabel,
} from '@/constants/control-options';
import { LOBBY_COPY } from '@/constants/lobby';
import { ControlCaption } from './control-caption';

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

/** Replay speed; the open list says how long the match will take. */
export function SpeedSelect({ title, value, onChange }: SpeedSelectProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1 @lg:w-44">
      <ControlCaption text={LOBBY_COPY.speedLabel} />
      <Select
        label={LOBBY_COPY.speedFor(title)}
        hideLabel
        size="md"
        value={String(value)}
        onChange={(id) => {
          const parsed = ReplaySpeed.safeParse(Number(id));
          if (parsed.success) onChange(parsed.data);
        }}
        options={OPTIONS}
        popoverWidth="wide"
      />
    </div>
  );
}

'use client';

import { REPLAY_SPEEDS, ReplaySpeed } from '@matchiq/contracts';
import { ClockIcon } from '@/components/icons';
import { type ChoiceOption, Select } from '@/components/ui';
import { usePageMessages } from '@/features/interface-language/use-page-messages';
import { ControlCaption } from './control-caption';

type SpeedSelectProps = {
  title: string;
  value: ReplaySpeed;
  onChange: (speed: ReplaySpeed) => void;
};

/** Replay speed; the open list says how long the match will take. */
export function SpeedSelect({ title, value, onChange }: SpeedSelectProps) {
  const copy = usePageMessages().lobby;
  const options: ChoiceOption[] = REPLAY_SPEEDS.map((speed) => ({
    id: String(speed),
    label: `${copy.speeds[speed].label} (${speed}×)`,
    description: copy.speeds[speed].description,
    icon: <ClockIcon size={15} />,
  }));
  return (
    <div className="flex min-w-0 flex-col gap-1 @lg:w-44">
      <ControlCaption text={copy.speedLabel} />
      <Select
        label={copy.speedFor(title)}
        hideLabel
        size="md"
        value={String(value)}
        onChange={(id) => {
          const parsed = ReplaySpeed.safeParse(Number(id));
          if (parsed.success) onChange(parsed.data);
        }}
        options={options}
        popoverWidth="wide"
      />
    </div>
  );
}

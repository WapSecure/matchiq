import type { ReplaySpeed } from '@matchiq/contracts';

/** Plain-language option cards for the lobby's replay and demo pickers. */
export const REPLAY_SPEED_CHOICES: Record<
  ReplaySpeed,
  { name: string; description: string }
> = {
  1: {
    name: 'Real time',
    description: 'A full match takes about 90 minutes.',
  },
  5: {
    name: 'Brisk',
    description: 'About 18 minutes. Good for a guided walkthrough.',
  },
  20: {
    name: 'Fast',
    description: 'About 5 minutes. Key moments arrive close together.',
  },
  30: {
    name: 'Highlights',
    description: 'About 3 minutes. Best for a quick demo.',
  },
};

export const speedChoiceLabel = (speed: ReplaySpeed): string =>
  `${REPLAY_SPEED_CHOICES[speed].name} (${speed}×)`;

export const NO_FAULT_KEY = 'none';

export const NO_FAULT_DESCRIPTION =
  'The replay runs normally, with no simulated failures.';

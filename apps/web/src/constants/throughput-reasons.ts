import type { FallbackGroup } from './fact-checks';

/**
 * Plain wording for fallback reasons added with demo-speed throughput
 * (MQ-088). Listed before the general patterns so `skipped` and
 * `rejected` wording elsewhere does not claim them first.
 */
export const THROUGHPUT_REASON_COPY: readonly {
  pattern: RegExp;
  text: string;
  group: FallbackGroup;
}[] = [
  {
    pattern: /SKIPPED_STALE/,
    text: 'Skipped so newer moments could be written.',
    group: 'OTHER',
  },
  {
    pattern: /recovered after a worker restart/i,
    text: 'Writing was interrupted by a restart, so standard wording went out.',
    group: 'AI_TROUBLE',
  },
  {
    pattern: /agents pipeline rejected/i,
    text: 'The fact check rejected the draft.',
    group: 'FACT_CHECK',
  },
];

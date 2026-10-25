import { describe, expect, it } from 'vitest';
import { FALLBACK_REASON_DEFAULT } from '@/constants/observatory';
import { plainFallbackReasons } from './plain-trace';

const KNOWN_REASONS = [
  'AI_ENABLED=false: deterministic templates only',
  'agents circuit breaker open',
  'SKIPPED_STALE: queued too long, template kept',
  'agents service timed out',
  'agents service unreachable',
  'agents service returned an invalid PipelineResult',
  'agents service answered HTTP 503',
  'could not enqueue the agents pipeline job',
  'every agent draft failed the publish gate',
  'agents pipeline rejected the insight, templates published',
  'recovered after a worker restart with AI disabled, templates published',
  'analyst: model output unavailable or ungrounded',
  'analyst: skipped to leave the writer time',
  'writer: model output unavailable',
  'fact checker rejected drafts (UNSUPPORTED_NUMBER)',
  'producer: overlay failed checks',
  'orchestration error',
];

describe('fallback reasons', () => {
  it.each(KNOWN_REASONS)('%s has a plain-language label', (reason) => {
    const sentences = plainFallbackReasons(reason);
    expect(sentences.length).toBeGreaterThan(0);
    expect(sentences).not.toContain(FALLBACK_REASON_DEFAULT.text);
  });

  it('explains a stale skip in the agreed words', () => {
    expect(
      plainFallbackReasons('SKIPPED_STALE: queued too long, template kept'),
    ).toEqual(['Skipped so newer moments could be written.']);
  });
});

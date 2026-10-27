import { OverlayEditorialState } from '@matchiq/contracts';
import { describe, expect, it } from 'vitest';
import { InsightEditorialTrace } from './trace-schemas';

describe('InsightEditorialTrace', () => {
  it.each(OverlayEditorialState.options)(
    'accepts the %s overlay state the API can send',
    (overlay) => {
      const parsed = InsightEditorialTrace.safeParse({
        insight: null,
        insightReason: null,
        overlay,
        overlayReason: null,
      });
      expect(parsed.success).toBe(true);
    },
  );
});

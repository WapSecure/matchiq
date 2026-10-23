import { RecapNarrative } from '../src/index.js';

const legacy = {
  persona: 'BROADCAST',
  locale: 'fr-FR',
  headline: 'Pressure is building',
  body: 'Three shots in five minutes.',
  source: 'TEMPLATE',
  citations: ['ev_3'],
};

describe('recap translation provenance', () => {
  it('accepts existing recaps without asserting that translation succeeded', () => {
    const parsed = RecapNarrative.parse(legacy);
    expect(parsed).not.toHaveProperty('localeFallback');
  });

  it.each([true, false])('preserves localeFallback=%s', (localeFallback) => {
    expect(RecapNarrative.parse({ ...legacy, localeFallback })).toEqual({
      ...legacy,
      localeFallback,
    });
  });

  it.each(['true', 1, null])(
    'rejects an invalid fallback marker: %s',
    (value) => {
      expect(
        RecapNarrative.safeParse({ ...legacy, localeFallback: value }).success,
      ).toBe(false);
    },
  );
});

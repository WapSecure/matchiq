import type { Locale } from '@matchiq/contracts';
import {
  causalityFindings,
  mentionsEvent,
  phraseRepeats,
  recentRepeat,
  tokenJaccard,
  type PublishedText,
} from '../src/index.js';

const DIGITS = /\d/u;
/** Stands in for the gate's test: a cited number or a named event. */
const grounded = (locale: Locale) => (sentence: string) =>
  DIGITS.test(sentence) || mentionsEvent(sentence, locale);
const causal = (text: string, locale: Locale) =>
  causalityFindings(text, locale, grounded(locale)).map((f) => f.rule);

describe('unsupported causality', () => {
  it.each([
    ['en-GB', 'Harbour City lead because they wanted it more.'],
    ['en-GB', 'Their confidence led to the turnaround.'],
    ['fr-FR', 'Harbour City mène parce que le moral est meilleur.'],
    ['fr-FR', 'Harbour City mène grâce à son état d’esprit.'],
    ['es-ES', 'Harbour City gana porque quería más.'],
    ['es-ES', 'Harbour City lidera gracias a su actitud.'],
    ['pcm-NG', 'Harbour City dey lead bikos dem hungry pass.'],
    ['pcm-NG', 'Na im make Harbour City dey happy.'],
  ])('%s: "%s" is flagged', (locale, text) => {
    expect(causal(text, locale as Locale)).toEqual(['UNSUPPORTED_CAUSALITY']);
  });

  it.each([
    ['en-GB', 'Possession rose to 64% because of their pressing.'],
    ['en-GB', 'Harbour City lead thanks to a late goal.'],
    ['fr-FR', 'Harbour City mène grâce à un but tardif.'],
    ['es-ES', 'Harbour City lidera gracias a un gol tardío.'],
    ['es-ES', 'La posesión subió al 64% porque presionan arriba.'],
    ['pcm-NG', 'Harbour City dey lead bikos of dat late goal.'],
    ['en-GB', 'Harbour City lead 2-1 after a late surge.'],
    ['fr-FR', 'Harbour City prend les devants.'],
  ])('%s: "%s" passes', (locale, text) => {
    expect(causal(text, locale as Locale)).toEqual([]);
  });

  it('flags only the unsupported sentence', () => {
    const text = 'A late goal changed it. They won because they believed.';
    expect(
      causalityFindings(text, 'en-GB', grounded('en-GB')).map((f) => f.excerpt),
    ).toEqual(['They won because they believed.']);
  });
});

const published = (
  headline: string,
  body: string,
  locale: Locale = 'en-GB',
): PublishedText => ({ persona: 'ANALYST', locale, headline, body });

describe('repetition', () => {
  it('scores token overlap with folded case and accents', () => {
    expect(tokenJaccard('Grâce à un but', 'grace a un BUT')).toBe(1);
    expect(tokenJaccard('a b', 'c d')).toBe(0);
  });

  it.each([
    ['en-GB', 'Harbour City press high', 'They win the ball back high up.'],
    [
      'fr-FR',
      'Harbour City presse haut',
      'Ils récupèrent le ballon très haut.',
    ],
    ['es-ES', 'Harbour City presiona arriba', 'Recuperan el balón muy arriba.'],
    ['pcm-NG', 'Harbour City dey press', 'Dem dey win ball for up well well.'],
  ])('%s: a near-identical recent narrative is a repeat', (l, h, b) => {
    const locale = l as Locale;
    const recent = [published(h, `${b} Again.`, locale)];
    expect(recentRepeat(published(h, b, locale), recent)?.reason).toBe(
      'recent_narrative',
    );
  });

  it('ignores other variants and genuinely different copy', () => {
    const draft = published('Harbour City press high', 'They win it back.');
    expect(recentRepeat(draft, [{ ...draft, persona: 'CASUAL' }])).toBeNull();
    expect(recentRepeat(draft, [{ ...draft, locale: 'fr-FR' }])).toBeNull();
    expect(
      recentRepeat(draft, [
        published('Goal for Harbour City', 'A low finish makes it 2-1.'),
      ]),
    ).toBeNull();
  });

  it.each([
    ['en-GB', 'They press high up the pitch and they press high up the pitch.'],
    ['fr-FR', 'Ils pressent très haut et encore ils pressent très haut.'],
    ['es-ES', 'Presionan muy arriba hoy y presionan muy arriba hoy.'],
    ['pcm-NG', 'Dem dey press well and dem dey press well again.'],
  ])('%s: a repeated phrase within one text is flagged', (_l, body) => {
    expect(phraseRepeats([body]).map((f) => f.reason)).toEqual([
      'repeated_phrase',
    ]);
  });

  it('allows Pidgin reduplication', () => {
    expect(phraseRepeats(['Dem dey press well well well well.'])).toEqual([]);
  });
});

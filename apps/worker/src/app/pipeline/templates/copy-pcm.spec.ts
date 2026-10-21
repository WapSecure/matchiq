import type { Fixture, NarrativeDraft } from '@matchiq/contracts';
import { PERSONAS } from '../../constants';
import { GOLDEN_SCENARIOS, goldenMoments } from '../../../test/golden';
import { gateContextOf } from '../publication';
import { gateNarrative, selectNarratives } from '../gate/publish-gate';
import { extractNumerals } from '../gate/text-checks';
import { templateDrafts } from './template-narratives';

const PIDGIN = 'pcm-NG' as const;

const textOf = (d: NarrativeDraft) => `${d.headline}\n${d.body}`;

const numerals = (d: NarrativeDraft) =>
  extractNumerals(textOf(d), d.locale)
    .map((n) => n.value)
    .sort((a, b) => a - b);

const names = (fixture: Fixture) => [
  fixture.home.name,
  fixture.away.name,
  ...[...fixture.home.players, ...fixture.away.players].map(
    (p) => p.displayName,
  ),
];

const expectSameFacts = (
  en: NarrativeDraft | undefined,
  pcm: NarrativeDraft | undefined,
  proper: readonly string[],
) => {
  if (en === undefined || pcm === undefined) throw new Error('expected a pair');
  expect(pcm.locale).toBe(PIDGIN);
  expect(numerals(pcm)).toEqual(numerals(en));
  expect(pcm.citedValues).toEqual(en.citedValues);
  const kept = proper.filter((name) => textOf(en).includes(name));
  expect(kept.filter((name) => !textOf(pcm).includes(name))).toEqual([]);
};

describe('Nigerian Pidgin template copy', () => {
  it.each(GOLDEN_SCENARIOS)(
    'passes the gate for every persona and insight in %s',
    async (scenario) => {
      const { fixture, insights } = await goldenMoments(scenario);
      for (const insight of insights) {
        const drafts = templateDrafts(insight, fixture, {
          personas: PERSONAS,
          locales: [PIDGIN],
        });
        expect(drafts.map((d) => d.locale)).toEqual([PIDGIN, PIDGIN, PIDGIN]);
        const context = gateContextOf(insight, fixture);
        expect(selectNarratives(drafts, context, 'TEMPLATE').rejected).toEqual(
          [],
        );
      }
    },
  );

  it.each(GOLDEN_SCENARIOS)(
    'keeps the English numbers, cited values and names in %s',
    async (scenario) => {
      const { fixture, insights } = await goldenMoments(scenario);
      for (const insight of insights) {
        const drafts = templateDrafts(insight, fixture, {
          personas: PERSONAS,
          locales: ['en-GB', PIDGIN],
        });
        for (let i = 0; i < drafts.length; i += 2) {
          expectSameFacts(drafts[i], drafts[i + 1], names(fixture));
        }
      }
    },
  );
});

describe('Pidgin number words in the gate', () => {
  it('reads English and Pidgin spellings but not the article "wan"', () => {
    const text = 'Dem don fire faiv shots, tri on target, wan chance remain';
    expect(extractNumerals(text, PIDGIN).map((n) => n.raw)).toEqual([
      'faiv',
      'tri',
    ]);
    expect(extractNumerals('seven pressures, sevin', PIDGIN)).toHaveLength(2);
    expect(extractNumerals('xG na 1.37', PIDGIN)[0]?.value).toBe(1.37);
  });

  it('rejects a Pidgin draft with a spelled-out number nobody cited', async () => {
    const { fixture, insights } = await goldenMoments('comeback');
    const [insight] = insights;
    if (insight === undefined) throw new Error('expected an insight');
    const [draft] = templateDrafts(insight, fixture, {
      personas: ['ANALYST'],
      locales: [PIDGIN],
    });
    if (draft === undefined) throw new Error('expected a draft');
    const context = gateContextOf(insight, fixture);
    expect(gateNarrative(draft, context).ok).toBe(true);
    const invented = {
      ...draft,
      body: `${draft.body} Dem don score nain goals.`,
    };
    const verdict = gateNarrative(invented, context);
    expect(verdict.ok ? [] : verdict.issues.map((i) => i.code)).toContain(
      'UNSUPPORTED_NUMBER',
    );
  });
});

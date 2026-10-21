import type { Insight, NarrativeDraft } from '@matchiq/contracts';
import {
  firstOfKind,
  GOLDEN_SCENARIOS,
  goldenMoments,
  type GoldenMoments,
} from '../../../test/golden';
import { gateContextOf } from '../publication';
import {
  templateDraft,
  templateDrafts,
  templateOverlay,
} from '../templates/template-narratives';
import { gateNarrative, gateOverlay, selectNarratives } from './publish-gate';
import { LOCALES, PERSONAS } from '../../constants';

const codesOf = (result: ReturnType<typeof gateNarrative>) =>
  result.ok ? [] : result.issues.map((i) => i.code);

describe('deterministic publish gate', () => {
  let golden: GoldenMoments;
  let goal: Insight;
  let valid: NarrativeDraft;

  beforeAll(async () => {
    golden = await goldenMoments('comeback');
    goal = firstOfKind(golden.insights, 'GOAL');
    valid = {
      ...templateDraft(goal, golden.fixture, {
        persona: 'ANALYST',
        locale: 'en-GB',
      }),
      source: 'AGENT',
    };
  });

  const ctx = () => gateContextOf(goal, golden.fixture);

  it('publishes a draft whose numbers, evidence and names are all grounded', () => {
    expect(gateNarrative(valid, ctx())).toEqual({ ok: true, value: valid });
  });

  it('rejects a cited value that differs from the evidence envelope', () => {
    const [first] = valid.citedValues;
    if (first === undefined) throw new Error('template cites nothing');
    const draft = {
      ...valid,
      citedValues: [{ ...first, value: first.value + 1 }],
    };
    expect(codesOf(gateNarrative(draft, ctx()))).toContain(
      'UNSUPPORTED_NUMBER',
    );
  });

  it('rejects a number in the text that is not a cited value', () => {
    const draft = { ...valid, body: `${valid.body} They had 47 corners.` };
    expect(codesOf(gateNarrative(draft, ctx()))).toEqual([
      'UNSUPPORTED_NUMBER',
    ]);
  });

  it('treats spelled-out numbers as claims too', () => {
    const draft = { ...valid, body: `${valid.body} That makes seventeen.` };
    expect(codesOf(gateNarrative(draft, ctx()))).toContain(
      'UNSUPPORTED_NUMBER',
    );
  });

  it('rejects event ids that are not in the envelope', () => {
    const draft = {
      ...valid,
      evidenceEventIds: [...valid.evidenceEventIds, 'ev_999999'],
    };
    expect(codesOf(gateNarrative(draft, ctx()))).toEqual(['UNCITED_EVIDENCE']);
  });

  it('rejects names outside the fixture entity allowlist', () => {
    const draft = {
      ...valid,
      body: `${valid.body} Pundits compared it to Manchester United.`,
    };
    expect(codesOf(gateNarrative(draft, ctx()))).toEqual([
      'UNKNOWN_ENTITY',
      'UNKNOWN_ENTITY',
    ]);
  });

  it('enforces persona length limits', () => {
    const casual = templateDraft(goal, golden.fixture, {
      persona: 'CASUAL',
      locale: 'en-GB',
    });
    const long = { ...casual, body: `${'Very long. '.repeat(30)}` };
    expect(codesOf(gateNarrative(long, ctx()))).toContain('LENGTH_EXCEEDED');
  });

  it('rejects schema violations and variants that were not requested', () => {
    expect(codesOf(gateNarrative({ persona: 'CASUAL' }, ctx()))).toContain(
      'SCHEMA_VIOLATION',
    );
    const narrowed = { ...ctx(), locales: ['en-GB' as const] };
    const french = { ...valid, locale: 'fr-FR' as const };
    expect(codesOf(gateNarrative(french, narrowed))).toEqual([
      'UNREQUESTED_VARIANT',
    ]);
  });

  it('gates overlay proposals through their metric refs', () => {
    const proposal = templateOverlay(goal, golden.fixture);
    expect(gateOverlay(proposal, ctx()).ok).toBe(true);
    const unknownRef = { ...proposal, metricRefs: ['corners.home.rolling5m'] };
    const verdict = gateOverlay(unknownRef, ctx());
    expect(verdict.ok).toBe(false);
  });

  it('keeps the first passing draft per variant and records every rejection', () => {
    const bad = { ...valid, body: `${valid.body} 99` };
    const selection = selectNarratives([bad, valid, valid], ctx(), 'AGENT');
    expect(selection.accepted).toEqual([valid]);
    expect(selection.rejected).toEqual([
      expect.objectContaining({
        item: 'NARRATIVE',
        persona: 'ANALYST',
        locale: 'en-GB',
        codes: ['UNSUPPORTED_NUMBER'],
      }),
    ]);
  });

  it.each(GOLDEN_SCENARIOS)(
    'passes every template variant and overlay for %s',
    async (scenario) => {
      const { fixture, insights } = await goldenMoments(scenario);
      for (const insight of insights) {
        const context = gateContextOf(insight, fixture);
        const drafts = templateDrafts(insight, fixture, {
          personas: PERSONAS,
          locales: LOCALES,
        });
        const { rejected } = selectNarratives(drafts, context, 'TEMPLATE');
        expect(rejected).toEqual([]);
        expect(gateOverlay(templateOverlay(insight, fixture), context).ok).toBe(
          true,
        );
      }
    },
  );
});

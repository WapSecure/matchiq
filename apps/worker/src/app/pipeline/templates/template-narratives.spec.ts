import { NarrativeDraft, OverlayProposal } from '@matchiq/contracts';
import { LOCALES, PERSONAS } from '../../constants';
import { firstOfKind, goldenMoments } from '../../../test/golden';
import { templateDrafts, templateOverlay } from './template-narratives';

describe('template fallback narratives', () => {
  it('produces one contract-valid TEMPLATE draft per persona and locale', async () => {
    const { fixture, insights } = await goldenMoments('comeback');
    const goal = firstOfKind(insights, 'GOAL');
    const drafts = templateDrafts(goal, fixture, {
      personas: PERSONAS,
      locales: LOCALES,
    });
    expect(drafts).toHaveLength(12);
    for (const draft of drafts) {
      expect(NarrativeDraft.parse(draft)).toEqual(draft);
      expect(draft.source).toBe('TEMPLATE');
      expect(draft.evidenceEventIds).toEqual(goal.evidence.eventIds);
    }
    const prose = drafts.filter((d) => d.persona !== 'BROADCAST');
    expect(new Set(prose.map((d) => d.body)).size).toBe(prose.length);
  });

  it('keeps the same cited facts in every locale', async () => {
    const { fixture, insights } = await goldenMoments('comeback');
    const burst = firstOfKind(insights, 'SHOT_BURST');
    const drafts = templateDrafts(burst, fixture, {
      personas: ['ANALYST'],
      locales: LOCALES,
    });
    const cited = drafts.map((d) => d.citedValues);
    expect(cited[1]).toEqual(cited[0]);
    expect(cited[2]).toEqual(cited[0]);
    expect(cited[3]).toEqual(cited[0]);
    const shots = cited[0]?.find((c) => c.metricRef.startsWith('shots.'));
    for (const draft of drafts) {
      expect(draft.body).toContain(String(shots?.value));
    }
  });

  it('localises decimal separators for French and Spanish, not Pidgin', async () => {
    const { fixture, insights } = await goldenMoments('comeback');
    const shift = firstOfKind(insights, 'MOMENTUM_SHIFT');
    const [en, fr, es, pcm] = templateDrafts(shift, fixture, {
      personas: ['ANALYST'],
      locales: LOCALES,
    });
    const momentum = en?.citedValues.find((c) => !Number.isInteger(c.value));
    if (momentum === undefined) throw new Error('expected a decimal metric');
    const text = String(Math.abs(momentum.value));
    expect(en?.body).toContain(text);
    expect(fr?.body).toContain(text.replace('.', ','));
    expect(es?.body).toContain(text.replace('.', ','));
    expect(pcm?.body).toContain(text);
  });

  it('derives a deterministic broadcast overlay from the insight', async () => {
    const { fixture, insights } = await goldenMoments('comeback');
    const goal = firstOfKind(insights, 'GOAL');
    const overlay = templateOverlay(goal, fixture);
    expect(OverlayProposal.parse(overlay)).toEqual(overlay);
    expect(overlay).toMatchObject({ kind: 'SCORE_UPDATE', priority: 90 });
    expect(templateOverlay(goal, fixture)).toEqual(overlay);
  });
});

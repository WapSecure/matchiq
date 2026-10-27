import {
  isInternalIndexMetric,
  type Locale,
  NarrativeDraft,
  OverlayProposal,
} from '@matchiq/contracts';
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

  it('never shows an internal index to fans or on the graphic', async () => {
    const { fixture, insights } = await goldenMoments('comeback');
    const shift = firstOfKind(insights, 'MOMENTUM_SHIFT');
    const drafts = templateDrafts(shift, fixture, {
      personas: ['CASUAL', 'BROADCAST'],
      locales: LOCALES,
    });
    const values = Object.entries(shift.evidence.computedMetrics)
      .filter(([ref]) => isInternalIndexMetric(ref))
      .map(([, value]) => String(Math.abs(value)));
    expect(values.length).toBeGreaterThan(0);
    for (const draft of drafts) {
      const text = `${draft.headline} ${draft.body}`.replaceAll(',', '.');
      for (const value of values) expect(text).not.toContain(value);
    }
    expect(templateOverlay(shift, fixture).body).not.toMatch(/\d/);
  });

  it('derives a deterministic broadcast overlay from the insight', async () => {
    const { fixture, insights } = await goldenMoments('comeback');
    const goal = firstOfKind(insights, 'GOAL');
    const overlay = templateOverlay(goal, fixture);
    expect(OverlayProposal.parse(overlay)).toEqual(overlay);
    expect(overlay).toMatchObject({ kind: 'SCORE_UPDATE', priority: 90 });
    expect(templateOverlay(goal, fixture)).toEqual(overlay);
  });

  describe('player milestones', () => {
    const milestones = async () => {
      const { fixture, insights } = await goldenMoments('comeback');
      return {
        fixture,
        list: insights.filter((i) => i.kind === 'PLAYER_MILESTONE'),
      };
    };

    it('say what the milestone is, with the cited count', async () => {
      const { fixture, list } = await milestones();
      expect(list.length).toBeGreaterThan(0);
      for (const insight of list) {
        const [ref, value] =
          Object.entries(insight.evidence.computedMetrics)[0] ?? [];
        const [broadcast] = templateDrafts(insight, fixture, {
          personas: ['BROADCAST'],
          locales: ['en-GB'],
        });
        expect(broadcast?.citedValues).toEqual([{ metricRef: ref, value }]);
        expect(broadcast?.headline).toMatch(new RegExp(`reach ${value} `));
        expect(broadcast?.headline.length).toBeLessThanOrEqual(60);
        expect(broadcast?.body).toMatch(new RegExp(`^${value} .+ so far$`));
        expect(`${broadcast?.headline} ${broadcast?.body}`).not.toMatch(
          /milestone/i,
        );
      }
    });

    it('uses singular and plural nouns in every locale', async () => {
      const { fixture, list } = await milestones();
      const base = list[0];
      if (base === undefined) throw new Error('expected a milestone');
      const make = (metric: string, value: number) => ({
        ...base,
        evidence: {
          ...base.evidence,
          computedMetrics: { [`${metric}.home`]: value },
        },
        teamId: fixture.home.teamId,
      });
      const body = (metric: string, value: number, locale: Locale) =>
        templateDrafts(make(metric, value), fixture, {
          personas: ['BROADCAST'],
          locales: [locale],
        })[0]?.body;
      expect(body('shotsOnTarget', 1, 'en-GB')).toBe('1 shot on target so far');
      expect(body('yellowCards', 3, 'en-GB')).toBe('3 yellow cards so far');
      expect(body('goals', 2, 'fr-FR')).toBe("2 buts jusqu'ici");
      expect(body('yellowCards', 1, 'es-ES')).toBe(
        '1 tarjeta amarilla hasta ahora',
      );
      expect(body('goals', 1, 'pcm-NG')).toBe('1 goal so far');
    });

    it('keeps the generic wording for an unknown metric', async () => {
      const { fixture, list } = await milestones();
      const base = list[0];
      if (base === undefined) throw new Error('expected a milestone');
      const unknown = {
        ...base,
        evidence: { ...base.evidence, computedMetrics: { 'touches.home': 5 } },
      };
      const [draft] = templateDrafts(unknown, fixture, {
        personas: ['BROADCAST'],
        locales: ['en-GB'],
      });
      expect(draft?.body).toBe('Milestone reached');
      expect(draft?.citedValues).toEqual([]);
    });
  });
});

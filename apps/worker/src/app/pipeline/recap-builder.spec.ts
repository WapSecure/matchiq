import { RecapDocument } from '@matchiq/contracts';
import { project, toSnapshot } from '@matchiq/football-engine';
import { goldenMoments } from '../../test/golden';
import { LOCALES, PERSONAS } from '../constants';
import { toNarrative } from './artifacts';
import { buildRecap } from './recap-builder';
import { templateDrafts } from './templates/template-narratives';

describe('buildRecap', () => {
  it('lists key moments in match order with evidence, narratives and the final score', async () => {
    const { fixture, events, insights } = await goldenMoments('comeback');
    const snapshot = toSnapshot(project(fixture, events));
    const periodOf = (clockMs: number, kind: string) =>
      events.find(
        (e) =>
          e.matchClockMs === clockMs && (kind !== 'GOAL' || e.type === 'GOAL'),
      )?.period ?? 1;
    const withPeriod = insights.map((insight) => ({
      insight,
      period: periodOf(insight.matchClockMs, insight.kind),
    }));
    const narratives = insights.flatMap((insight) =>
      templateDrafts(insight, fixture, {
        personas: PERSONAS,
        locales: LOCALES,
      }).map((d) => toNarrative(insight, d, '2026-10-24T15:00:00.000Z')),
    );
    const recap = buildRecap({
      fixtureId: fixture.fixtureId,
      title: fixture.title,
      snapshot,
      insights: [...withPeriod].reverse(),
      narratives,
    });

    expect(recap.finalSnapshot.score).toEqual({ home: 3, away: 2 });
    expect(recap.keyMoments).toHaveLength(insights.length);
    expect(recap.keyMoments.filter((m) => m.kind === 'GOAL')).toHaveLength(5);
    const order = recap.keyMoments.map((m) => [m.period, m.matchClockMs]);
    const sorted = [...order].sort(
      (a, b) => (a[0] ?? 0) - (b[0] ?? 0) || (a[1] ?? 0) - (b[1] ?? 0),
    );
    expect(order).toEqual(sorted);
    const first = recap.keyMoments[0];
    expect(first?.evidenceEventIds.length).toBeGreaterThan(0);
    expect(first?.narratives.map((n) => `${n.persona}/${n.locale}`)).toEqual(
      PERSONAS.flatMap((p) => LOCALES.map((l) => `${p}/${l}`)),
    );
    expect(JSON.stringify(recap)).not.toContain('2026-10-24T15:00:00.000Z');
    expect(
      buildRecap({
        fixtureId: fixture.fixtureId,
        title: fixture.title,
        snapshot,
        insights: withPeriod,
        narratives,
      }),
    ).toEqual(recap);
  });

  it('preserves fallback provenance without changing the match facts', async () => {
    const { fixture, events, insights } = await goldenMoments('comeback');
    const snapshot = toSnapshot(project(fixture, events));
    const narratives = insights.flatMap((insight) =>
      templateDrafts(insight, fixture, {
        personas: PERSONAS,
        locales: LOCALES,
      }).map((draft) => ({
        ...toNarrative(insight, draft, '2026-10-24T15:00:00.000Z'),
        localeFallback: draft.locale === 'fr-FR',
      })),
    );
    const original = JSON.stringify(narratives);
    const recap = buildRecap({
      fixtureId: fixture.fixtureId,
      title: fixture.title,
      snapshot,
      insights: insights.map((insight) => ({ insight, period: 1 })),
      narratives,
    });
    const variants = recap.keyMoments.flatMap((moment) => moment.narratives);
    expect(variants.length).toBe(narratives.length);
    expect(variants.filter((n) => n.locale === 'fr-FR').length).toBeGreaterThan(
      0,
    );
    for (const variant of variants) {
      expect(variant.localeFallback).toBe(variant.locale === 'fr-FR');
    }
    expect(RecapDocument.parse(recap)).toEqual(recap);
    expect(recap.finalSnapshot).toEqual(snapshot);
    expect(JSON.stringify(narratives)).toBe(original);
  });
});

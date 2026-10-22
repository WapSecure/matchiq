import { project, toSnapshot } from '@matchiq/football-engine';
import { goldenMoments } from '../../../test/golden';
import { templateDraft } from './template-narratives';

describe('goal insights on the comeback fixture (MQ-024)', () => {
  it('quote the engine score after each goal and carry the goal period', async () => {
    const { fixture, events, insights } = await goldenMoments('comeback');
    const goals = insights.filter((i) => i.kind === 'GOAL');
    expect(goals).toHaveLength(5);
    for (const insight of goals) {
      const goal = events.find(
        (e) => e.eventId === insight.evidence.eventIds[0],
      );
      if (goal === undefined) throw new Error('goal event missing');
      const { score } = toSnapshot(
        project(
          fixture,
          events.filter((e) => e.sequence <= goal.sequence),
        ),
      );
      const draft = templateDraft(insight, fixture, {
        persona: 'BROADCAST',
        locale: 'en-GB',
      });
      expect(draft.body).toBe(
        `${fixture.home.name} ${score.home}-${score.away} ${fixture.away.name}`,
      );
      expect(insight.period).toBe(goal.period);
      expect(insight.matchClockMs).toBe(goal.matchClockMs);
    }
    const inMatchOrder = [...goals].sort(
      (a, b) => a.period - b.period || a.matchClockMs - b.matchClockMs,
    );
    expect(inMatchOrder.map((i) => i.evidence.computedMetrics)).toEqual(
      [
        [0, 1],
        [0, 2],
        [1, 2],
        [2, 2],
        [3, 2],
      ].map(([home, away]) =>
        expect.objectContaining({ 'goals.home': home, 'goals.away': away }),
      ),
    );
  });
});

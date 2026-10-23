import type { MatchEvent } from '@matchiq/contracts';
import { fixture, insight, shot } from '@/test/factories';
import { buildRoster } from './roster';
import { buildSeekMarks } from './seek-marks';

const goal = (sequence: number): MatchEvent =>
  ({
    ...shot(sequence),
    type: 'GOAL',
    ownGoal: false,
    assistPlayerId: null,
  }) as unknown as MatchEvent;

describe('buildSeekMarks', () => {
  const roster = buildRoster(fixture());

  it('marks goals by team and moments at their last play', () => {
    const timeline = [shot(1), goal(2), shot(3)];
    const moment = insight({
      evidence: { ...insight().evidence, eventIds: ['ev_1', 'ev_3'] },
    });
    expect(buildSeekMarks(timeline, {}, [moment], roster)).toEqual([
      { id: 'ev_2', sequence: 2, kind: 'goal', side: 'home' },
      { id: moment.insightId, sequence: 3, kind: 'moment', side: 'home' },
    ]);
  });

  it('skips corrected goals and moments whose plays are not loaded', () => {
    const moment = insight({
      evidence: { ...insight().evidence, eventIds: ['ev_99'] },
    });
    expect(
      buildSeekMarks([goal(2)], { ev_2: 'Disallowed' }, [moment], roster),
    ).toEqual([]);
  });
});

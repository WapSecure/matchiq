import type { EditorialStatus } from '@matchiq/contracts';
import { ApiError } from '@/lib/api/api-error';
import { describeEditorialProblem } from '@/lib/api/describe-editorial-problem';
import { trace } from '@/test/session-factories';
import { FX } from '@/test/factories';
import { MODE_VIEW } from '@/constants/editorial';
import { initialMatchData, reduceMessage } from '../store';
import {
  modeOf,
  reduceEditorial,
  withKillSwitch,
} from '../store/reduce-editorial';
import { reduceRetract } from '../store/reduce-overlays';
import { insightMarks } from './insight-marks';
import { reasonError } from './reason';

const T1 = '2026-10-24T14:00:00.000Z';
const T2 = '2026-10-24T14:05:00.000Z';

const status = (overrides: Partial<EditorialStatus> = {}): EditorialStatus => ({
  fixtureId: FX,
  mode: 'FROZEN',
  freeze: { active: true, changedAt: T2 },
  killSwitch: { active: false, changedAt: null },
  ...overrides,
});

const auto = status({ mode: 'AUTO', freeze: { active: false, changedAt: T1 } });

describe('editorial store mapping', () => {
  it('applies stream status in order and ignores an older REST read', () => {
    const state = { ...initialMatchData(FX), editorial: status() };
    expect(reduceEditorial(state, auto, 'rest')).toEqual({});
    expect(reduceEditorial(state, auto, 'stream')).toEqual({ editorial: auto });
  });

  it('reduces an editorial.status message into MatchData.editorial', () => {
    const next = reduceMessage(initialMatchData(FX), {
      schemaVersion: 1,
      streamSequence: 1,
      fixtureId: FX,
      emittedAt: T2,
      type: 'editorial.status',
      payload: status(),
    });
    expect(next.editorial?.mode).toBe('FROZEN');
  });

  it('ranks the kill switch above a freeze', () => {
    const on = { active: true, changedAt: T2 };
    const off = { active: false, changedAt: null };
    expect(modeOf(on, on)).toBe('KILLED');
    expect(modeOf(on, off)).toBe('FROZEN');
    expect(modeOf(off, off)).toBe('AUTO');
    const killed = withKillSwitch({ fixtureId: FX, editorial: null }, on);
    expect(killed).toMatchObject({ mode: 'KILLED', fixtureId: FX });
  });

  it('maps each mode to its chip and standby copy', () => {
    expect(MODE_VIEW.AUTO.standby).toBeNull();
    expect(MODE_VIEW.FROZEN.standby).toBe('Held: graphics paused');
    expect(MODE_VIEW.KILLED.standby).toBe('Held: emergency stop');
  });

  it('keeps the retraction cause for the cue log', () => {
    const next = reduceRetract(initialMatchData(FX), {
      overlayId: 'ov_1',
      revision: 1,
      reason: 'editorial kill switch activated',
      cause: 'KILL_SWITCH',
    });
    expect(next.retractions?.[0]).toMatchObject({
      cause: 'KILL_SWITCH',
      ending: 'RETRACTED',
    });
  });
});

describe('insight marks', () => {
  it('marks held, suppressed and published insights', () => {
    const markOf = insightMarks(
      [
        trace({
          insightId: 'in_held',
          publication: 'PENDING',
          editorial: {
            insight: null,
            insightReason: null,
            overlay: 'HELD',
            overlayReason: 'EDITORIAL_FREEZE',
          },
        }),
        trace({ insightId: 'in_pub', publication: 'TEMPLATE' }),
      ],
      { in_local: true },
    );
    expect(markOf('in_held')).toEqual({
      labels: ['Held: graphics paused'],
      suppressed: false,
      published: false,
    });
    expect(markOf('in_pub').published).toBe(true);
    expect(markOf('in_local')).toMatchObject({
      labels: ['Dropped'],
      suppressed: true,
    });
    expect(markOf('in_unknown')).toEqual({
      labels: [],
      suppressed: false,
      published: false,
    });
  });
});

describe('reason and problem copy', () => {
  it('validates the reason like the contract', () => {
    expect(reasonError('  ab ')).toMatch(/at least 3/);
    expect(reasonError('x'.repeat(281))).toMatch(/280 characters or fewer/);
    expect(reasonError('Wrong scorer named')).toBeNull();
  });

  it('turns RFC 9457 problems into readable messages', () => {
    const problem = (status: number, slug: string) =>
      new ApiError('http', {
        type: `urn:matchiq:problem:${slug}`,
        title: 'Conflict',
        status,
        requestId: 'req_1',
      });
    expect(describeEditorialProblem(problem(409, 'overlay-not-on-air'))).toBe(
      "That graphic is no longer on air. There's nothing to take off air.",
    );
    expect(describeEditorialProblem(problem(401, 'unauthorized'))).toMatch(
      /Sign in again as a producer/,
    );
    expect(describeEditorialProblem(problem(403, 'forbidden'))).toMatch(
      /role can't do this/,
    );
    expect(describeEditorialProblem(problem(500, 'internal-error'))).toBe(
      'Something went wrong on our side. Nothing was changed.',
    );
    expect(describeEditorialProblem(new Error('x'))).toMatch(
      /Nothing was changed/,
    );
  });
});

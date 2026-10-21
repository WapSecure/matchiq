import type { MatchEvent } from '@matchiq/contracts';
import { canonicalJson } from '../hash.js';
import type { ValidationContext } from './context.js';
import { ISSUE_MESSAGES as M } from './issues.js';

const STRUCTURAL_TYPES = new Set<MatchEvent['type']>([
  'MATCH_STARTED',
  'PERIOD_STARTED',
  'PERIOD_ENDED',
  'MATCH_ENDED',
]);

const checkIdentity = (
  ctx: ValidationContext,
  event: MatchEvent,
  index: number,
): void => {
  if (event.sequence !== index) {
    ctx.report('SEQUENCE_GAP', event, M.sequence(event.sequence, index));
  }
  if (ctx.byId.has(event.eventId)) {
    ctx.report('DUPLICATE_EVENT_ID', event, M.duplicateId(event.eventId));
  }
  if (event.fixtureId !== ctx.fixture.fixtureId) {
    ctx.report(
      'FIXTURE_MISMATCH',
      event,
      M.fixtureId(event.fixtureId, ctx.fixture.fixtureId),
    );
  }
  if (
    canonicalJson(event.provenance) !== canonicalJson(ctx.fixture.provenance)
  ) {
    ctx.report('FIXTURE_MISMATCH', event, M.provenance);
  }
};

const checkClocks = (ctx: ValidationContext, event: MatchEvent): void => {
  const previous = ctx.previous;
  if (previous === null) return;
  if (
    previous.period === event.period &&
    event.matchClockMs < previous.matchClockMs
  ) {
    ctx.report(
      'CLOCK_REGRESSION',
      event,
      M.clock(event.matchClockMs, previous.matchClockMs),
    );
  }
  if (Date.parse(event.wallClockUtc) < Date.parse(previous.wallClockUtc)) {
    ctx.report('CLOCK_REGRESSION', event, M.wallClock);
  }
};

const checkStructural = (
  ctx: ValidationContext,
  event: MatchEvent,
  index: number,
): void => {
  if (event.type === 'MATCH_STARTED') {
    if (index !== 0 || ctx.started)
      ctx.report('PERIOD_STRUCTURE', event, M.matchStartOnce);
    ctx.started = true;
  } else if (event.type === 'PERIOD_STARTED') {
    if (ctx.openPeriod !== null)
      ctx.report('PERIOD_STRUCTURE', event, M.periodAlreadyOpen);
    if (event.period !== ctx.lastPeriod + 1) {
      ctx.report(
        'PERIOD_STRUCTURE',
        event,
        M.periodOrder(event.period, ctx.lastPeriod + 1),
      );
    }
    ctx.openPeriod = event.period;
    ctx.lastPeriod = event.period;
  } else if (event.type === 'PERIOD_ENDED') {
    if (ctx.openPeriod !== event.period) {
      ctx.report('PERIOD_STRUCTURE', event, M.periodNotOpen(event.period));
    }
    ctx.openPeriod = null;
  } else {
    if (ctx.openPeriod !== null || ctx.lastPeriod === 0) {
      ctx.report('PERIOD_STRUCTURE', event, M.matchEndOpen);
    }
    ctx.ended = true;
  }
};

/** Identity, ordering, clock and period checks shared by every event type. */
export const checkStructure = (
  ctx: ValidationContext,
  event: MatchEvent,
  index: number,
): void => {
  checkIdentity(ctx, event, index);
  if (ctx.ended) ctx.report('EVENT_AFTER_MATCH_END', event, M.afterEnd);
  if (index === 0 && event.type !== 'MATCH_STARTED') {
    ctx.report('PERIOD_STRUCTURE', event, M.matchStartFirst);
  }
  checkClocks(ctx, event);
  if (STRUCTURAL_TYPES.has(event.type)) {
    checkStructural(ctx, event, index);
  } else if (ctx.openPeriod !== event.period) {
    ctx.report('PERIOD_STRUCTURE', event, M.periodNotOpen(event.period));
  }
};

export const checkStreamEnd = (ctx: ValidationContext): void => {
  if (!ctx.ended) ctx.report('PERIOD_STRUCTURE', ctx.previous, M.missingEnd);
};

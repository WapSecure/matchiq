import { Fixture, MatchEvent } from '@matchiq/contracts';
import type { z } from 'zod';
import type { Score } from '../types.js';
import { ValidationContext } from './context.js';
import type { FixtureIssue, ValidationReport } from './issues.js';
import { checkParticipants } from './participants.js';
import { checkReferences } from './references.js';
import { checkStreamEnd, checkStructure } from './structure.js';

const schemaIssues = (
  error: z.ZodError,
  prefix: readonly PropertyKey[],
): FixtureIssue[] =>
  error.issues.map((issue) => ({
    code: 'SCHEMA_INVALID',
    message: issue.message,
    path: [...prefix, ...issue.path],
  }));

const invalid = (
  issues: FixtureIssue[],
  eventCount: number,
): ValidationReport => ({
  valid: false,
  issues,
  score: null,
  eventCount,
});

const parseEvents = (
  events: readonly unknown[],
): { parsed: MatchEvent[]; issues: FixtureIssue[] } => {
  const parsed: MatchEvent[] = [];
  const issues: FixtureIssue[] = [];
  events.forEach((raw, index) => {
    const result = MatchEvent.safeParse(raw);
    if (result.success) parsed.push(result.data);
    else issues.push(...schemaIssues(result.error, ['events', index]));
  });
  return { parsed, issues };
};

export interface ValidatedStream {
  readonly report: ValidationReport;
  /** Parsed inputs, present only when both passed schema validation. */
  readonly data: {
    readonly fixture: Fixture;
    readonly events: readonly MatchEvent[];
  } | null;
}

export const analyseFixtureEvents = (
  fixture: unknown,
  events: readonly unknown[],
): ValidatedStream => {
  const fixtureResult = Fixture.safeParse(fixture);
  const { parsed, issues: eventIssues } = parseEvents(events);
  if (!fixtureResult.success || eventIssues.length > 0) {
    const fixtureIssues = fixtureResult.success
      ? []
      : schemaIssues(fixtureResult.error, ['fixture']);
    return {
      report: invalid([...fixtureIssues, ...eventIssues], events.length),
      data: null,
    };
  }

  const ctx = new ValidationContext(fixtureResult.data);
  parsed.forEach((event, index) => {
    checkStructure(ctx, event, index);
    checkParticipants(ctx, event);
    checkReferences(ctx, event);
    ctx.byId.set(event.eventId, event);
    ctx.previous = event;
  });
  checkStreamEnd(ctx);

  const score: Score = {
    home: ctx.goals.get(ctx.fixture.home.teamId) ?? 0,
    away: ctx.goals.get(ctx.fixture.away.teamId) ?? 0,
  };
  return {
    report: {
      valid: ctx.issues.length === 0,
      issues: ctx.issues,
      score,
      eventCount: parsed.length,
    },
    data: { fixture: ctx.fixture, events: parsed },
  };
};

/**
 * Validates a fixture and its full event stream: contract schemas first, then
 * ordering, clocks, period structure, participants and references in one pass.
 */
export const validateFixtureEvents = (
  fixture: unknown,
  events: readonly unknown[],
): ValidationReport => analyseFixtureEvents(fixture, events).report;

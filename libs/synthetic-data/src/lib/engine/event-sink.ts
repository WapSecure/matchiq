import type { FixtureId, MatchEvent, Provenance } from '@matchiq/contracts';
import { ID_FORMAT } from '../constants.js';
import type { GameClock } from './game-clock.js';

type BaseKey =
  | 'schemaVersion'
  | 'eventId'
  | 'fixtureId'
  | 'sequence'
  | 'period'
  | 'matchClockMs'
  | 'wallClockUtc'
  | 'provenance';

/** The type-specific part of an event; the sink stamps identity, order and time. */
export type EventBody = MatchEvent extends infer E
  ? E extends MatchEvent
    ? Omit<E, BaseKey>
    : never
  : never;

export class EventSink {
  readonly events: MatchEvent[] = [];
  private readonly fixtureId: FixtureId;
  private readonly provenance: Provenance;
  private readonly clock: GameClock;

  constructor(fixtureId: FixtureId, provenance: Provenance, clock: GameClock) {
    this.fixtureId = fixtureId;
    this.provenance = provenance;
    this.clock = clock;
  }

  emit(body: EventBody): MatchEvent {
    const sequence = this.events.length;
    const event: MatchEvent = {
      schemaVersion: 1,
      eventId: ID_FORMAT.event(sequence),
      fixtureId: this.fixtureId,
      sequence,
      period: this.clock.period,
      matchClockMs: this.clock.ms,
      wallClockUtc: this.clock.wallClockUtc(),
      provenance: { ...this.provenance },
      ...body,
    };
    this.events.push(event);
    return event;
  }
}

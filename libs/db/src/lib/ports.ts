import type {
  AuditActorType,
  CursorPage,
  CursorPageQuery,
  Fixture,
  MatchEvent,
  StreamMessage,
} from '@matchiq/contracts';

export interface FixtureKey {
  readonly orgId: string;
  readonly fixtureId: string;
}

/** The identity of a stored event, enough to classify a re-submission. */
export interface StoredEventRef {
  readonly eventId: string;
  readonly sequence: number;
  readonly payloadHash: string;
}

/** The highest-sequence stored event, which a streamed batch must continue from. */
export interface StoredEventTail {
  readonly sequence: number;
  readonly type: MatchEvent['type'];
  readonly period: number;
  readonly matchClockMs: number;
}

export interface HashedEvent {
  readonly event: MatchEvent;
  readonly payloadHash: string;
}

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never;

/** A stream message before the outbox allocates its `streamSequence`. */
export type StreamMessageDraft = DistributiveOmit<
  StreamMessage,
  'streamSequence'
>;

export interface AuditEntry {
  readonly orgId: string;
  readonly actor: string;
  /** Defaults to OPERATOR. */
  readonly actorType?: AuditActorType;
  /** The actor's display name at write time; people only. */
  readonly actorDisplayName?: string;
  readonly action: string;
  readonly targetType: string;
  readonly targetId: string;
  readonly fixtureId?: string;
  readonly reason?: string;
  readonly correlationId?: string;
  readonly requestId?: string;
  readonly before?: Record<string, unknown>;
  readonly after?: Record<string, unknown>;
  readonly details: Record<string, unknown>;
}

export interface IdempotencyRequest {
  readonly orgId: string;
  readonly scope: string;
  readonly key: string;
  readonly requestHash: string;
}

export interface StoredResponse {
  readonly status: number;
  readonly body: unknown;
}

export type IdempotencyClaim =
  | { readonly kind: 'claimed' }
  | { readonly kind: 'replay'; readonly response: StoredResponse }
  | { readonly kind: 'mismatch' };

/** Operations that must commit atomically with each other. */
export interface LedgerTransaction {
  insertFixture(
    orgId: string,
    fixture: Fixture,
    payloadHash: string,
  ): Promise<boolean>;
  /** Locks the fixture row for the rest of the transaction; false if absent. */
  lockFixture(key: FixtureKey): Promise<boolean>;
  findEventRefs(
    key: FixtureKey,
    eventIds: readonly string[],
    sequences: readonly number[],
  ): Promise<StoredEventRef[]>;
  /** Null while the fixture has no events. */
  findEventTail(key: FixtureKey): Promise<StoredEventTail | null>;
  insertEvents(
    key: FixtureKey,
    ingestionId: string,
    events: readonly HashedEvent[],
  ): Promise<void>;
  /** Allocates contiguous stream sequences and validates every message. */
  appendStreamMessages(
    key: FixtureKey,
    drafts: readonly StreamMessageDraft[],
  ): Promise<StreamMessage[]>;
  /** Returns the audit row id. */
  appendAudit(entry: AuditEntry): Promise<string>;
  appendAudits(entries: readonly AuditEntry[]): Promise<void>;
  claimIdempotencyKey(request: IdempotencyRequest): Promise<IdempotencyClaim>;
  completeIdempotencyKey(
    request: IdempotencyRequest,
    response: StoredResponse,
  ): Promise<void>;
}

export interface UnitOfWork {
  transaction<T>(work: (tx: LedgerTransaction) => Promise<T>): Promise<T>;
}

export interface FixtureReader {
  get(key: FixtureKey): Promise<Fixture | null>;
  list(orgId: string, limit: number): Promise<Fixture[]>;
  page(orgId: string, query: CursorPageQuery): Promise<CursorPage<Fixture>>;
}

export interface EventReader {
  listAfter(
    key: FixtureKey,
    afterSequence: number,
    limit: number,
  ): Promise<MatchEvent[]>;
}

export interface StreamRange {
  readonly after: number;
  readonly limit: number;
  /** Inclusive upper bound. */
  readonly upTo?: number;
}

export interface StreamHistory {
  /** Highest committed stream sequence, or null when the fixture is unknown. */
  head(key: FixtureKey): Promise<number | null>;
  read(key: FixtureKey, range: StreamRange): Promise<StreamMessage[]>;
}

export interface OutboxRecord {
  readonly key: FixtureKey;
  readonly message: StreamMessage;
}

export interface OutboxStore {
  /**
   * Claims up to `limit` unpublished rows, hands them to `publish` in stream
   * order and marks the ones it accepted as published. Returns the count marked.
   */
  drain(
    limit: number,
    publish: (record: OutboxRecord) => Promise<void>,
  ): Promise<number>;
}

export interface StreamPublisher {
  publish(key: FixtureKey, message: StreamMessage): Promise<void>;
}

export type Unsubscribe = () => Promise<void>;

export interface StreamSubscriber {
  subscribe(
    key: FixtureKey,
    onMessage: (message: StreamMessage) => void,
  ): Promise<Unsubscribe>;
}

export interface Pingable {
  ping(): Promise<void>;
}

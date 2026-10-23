import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { type EventPage, Fixture, type FixtureList } from '@matchiq/contracts';
import {
  AUDIT_ACTIONS,
  type EventReader,
  type FixtureKey,
  type FixtureReader,
  sha256Hex,
  type UnitOfWork,
} from '@matchiq/db';
import { actorTypeOf, auditNameOf } from '../auth/actor';
import { actorDetails } from '../auth/audit-trail.service';
import { AUDIT_TARGETS, IDEMPOTENCY_SCOPES } from '../constants';
import type { CallerContext } from '../http/caller-context';
import { type IdempotentResult, withIdempotency } from '../http/idempotency';
import { problem } from '../http/problems';
import {
  EVENT_READER,
  FIXTURE_READER,
  UNIT_OF_WORK,
} from '../infrastructure/tokens';
import type { EventPageQuery, FixtureListQuery } from './fixtures.schemas';

export type { EventPage, FixtureList } from '@matchiq/contracts';

export type CreateFixtureCommand = CallerContext & {
  readonly fixture: Fixture;
};

/** The organisation always comes from the caller's principal (ADR-0018). */
@Injectable()
export class FixturesService {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(FIXTURE_READER) private readonly fixtures: FixtureReader,
    @Inject(EVENT_READER) private readonly events: EventReader,
  ) {}

  create(command: CreateFixtureCommand): Promise<IdempotentResult<Fixture>> {
    const { fixture, principal } = command;
    const { orgId } = principal;
    return this.uow.transaction((tx) =>
      withIdempotency(
        tx,
        {
          orgId,
          scope: IDEMPOTENCY_SCOPES.createFixture,
          key: command.idempotencyKey,
          request: fixture,
          parse: (body) => Fixture.parse(body),
        },
        async () => {
          if (!(await tx.insertFixture(orgId, fixture, sha256Hex(fixture)))) {
            throw problem('fixtureExists', { detail: fixture.fixtureId });
          }
          await tx.appendAudit({
            orgId,
            actor: principal.userId,
            actorType: actorTypeOf(principal),
            ...auditNameOf(principal),
            action: AUDIT_ACTIONS.fixtureCreated,
            targetType: AUDIT_TARGETS.fixture,
            targetId: fixture.fixtureId,
            fixtureId: fixture.fixtureId,
            requestId: command.requestId,
            details: {
              ...actorDetails(principal),
              title: fixture.title,
              provenance: fixture.provenance,
            },
          });
          return { status: HttpStatus.CREATED, body: fixture };
        },
      ),
    );
  }

  /** Another organisation's fixture answers the same 404 as a missing one. */
  async get(key: FixtureKey): Promise<Fixture> {
    const fixture = await this.fixtures.get(key);
    if (!fixture) throw problem('fixtureNotFound', { detail: key.fixtureId });
    return fixture;
  }

  async list(orgId: string, { limit }: FixtureListQuery): Promise<FixtureList> {
    return { items: await this.fixtures.list(orgId, limit) };
  }

  async listEvents(key: FixtureKey, query: EventPageQuery): Promise<EventPage> {
    await this.get(key);
    const items = await this.events.listAfter(
      key,
      query.afterSequence,
      query.limit,
    );
    const last = items.at(-1);
    return {
      items,
      nextAfterSequence:
        items.length === query.limit && last ? last.sequence : null,
    };
  }
}

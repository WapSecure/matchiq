import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { ApiEnv } from '@matchiq/config';
import { type EventPage, Fixture, type FixtureList } from '@matchiq/contracts';
import {
  AUDIT_ACTIONS,
  type EventReader,
  type FixtureKey,
  type FixtureReader,
  sha256Hex,
  type UnitOfWork,
} from '@matchiq/db';
import { APP_ENV } from '@matchiq/server-kit';
import { AUDIT_TARGETS, AUTH, IDEMPOTENCY_SCOPES } from '../constants';
import { type IdempotentResult, withIdempotency } from '../http/idempotency';
import { problem } from '../http/problems';
import {
  EVENT_READER,
  FIXTURE_READER,
  UNIT_OF_WORK,
} from '../infrastructure/tokens';
import type { EventPageQuery, FixtureListQuery } from './fixtures.schemas';

export type { EventPage, FixtureList } from '@matchiq/contracts';

export interface CreateFixtureCommand {
  readonly fixture: Fixture;
  readonly requestId?: string;
  readonly idempotencyKey?: string;
}

@Injectable()
export class FixturesService {
  constructor(
    @Inject(APP_ENV) private readonly env: ApiEnv,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(FIXTURE_READER) private readonly fixtures: FixtureReader,
    @Inject(EVENT_READER) private readonly events: EventReader,
  ) {}

  /** Tenant identity comes from configuration, never from the client (ADR-0007). */
  keyOf(fixtureId: string): FixtureKey {
    return { orgId: this.env.DEMO_ORG_ID, fixtureId };
  }

  create(command: CreateFixtureCommand): Promise<IdempotentResult<Fixture>> {
    const { fixture } = command;
    const { orgId } = this.keyOf(fixture.fixtureId);
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
            actor: AUTH.operatorActor,
            action: AUDIT_ACTIONS.fixtureCreated,
            targetType: AUDIT_TARGETS.fixture,
            targetId: fixture.fixtureId,
            fixtureId: fixture.fixtureId,
            requestId: command.requestId,
            details: { title: fixture.title, provenance: fixture.provenance },
          });
          return { status: HttpStatus.CREATED, body: fixture };
        },
      ),
    );
  }

  async get(fixtureId: string): Promise<Fixture> {
    const fixture = await this.fixtures.get(this.keyOf(fixtureId));
    if (!fixture) throw problem('fixtureNotFound', { detail: fixtureId });
    return fixture;
  }

  async list({ limit }: FixtureListQuery): Promise<FixtureList> {
    return { items: await this.fixtures.list(this.env.DEMO_ORG_ID, limit) };
  }

  async listEvents(
    fixtureId: string,
    query: EventPageQuery,
  ): Promise<EventPage> {
    await this.get(fixtureId);
    const items = await this.events.listAfter(
      this.keyOf(fixtureId),
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

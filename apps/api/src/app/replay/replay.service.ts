import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { Principal } from '@matchiq/access';
import type { ApiEnv } from '@matchiq/config';
import {
  type ItemList,
  ReplayStatus,
  type FaultPlan,
  type ReplayCommand,
  type ReplaySpeed,
} from '@matchiq/contracts';
import {
  SessionCapacityExceeded,
  type CreatedSession,
  type FixtureKey,
  type FixtureTemplateSummary,
  type ReplayCommandBus,
  type ReplaySessionView,
} from '@matchiq/db';
import { APP_ENV } from '@matchiq/server-kit';
import { actorTypeOf } from '../auth/actor';
import { actorDetails } from '../auth/audit-trail.service';
import {
  API_LIMITS,
  HEADERS,
  IDEMPOTENCY_SCOPES,
  REPLAY_CAPACITY,
} from '../constants';
import type { IdempotencyScope, IdempotentResult } from '../http/idempotency';
import { IdempotencyService } from '../http/idempotency.service';
import { problem } from '../http/problems';
import type { ReplayStores } from '../infrastructure/replay-providers';
import { REPLAY_COMMAND_BUS, REPLAY_STORES } from '../infrastructure/tokens';
import { checkTransition } from './replay-transitions';
import { CreatedSessionResponse } from './replay.schemas';

export type { ItemList } from '@matchiq/contracts';

export interface ReplayRequest {
  readonly principal: Principal;
  readonly idempotencyKey?: string;
  readonly requestId?: string;
}

const capacityProblem = (active: number, max: number) =>
  problem('replayCapacity', {
    detail: REPLAY_CAPACITY.detail(active, max),
    headers: {
      [HEADERS.retryAfter]: String(API_LIMITS.replayCapacityRetryAfterS),
    },
  });

const needsSlot = (command: ReplayCommand): boolean =>
  (REPLAY_CAPACITY.slotActions as readonly string[]).includes(command.action);

const keyOf = (orgId: string, fixtureId: string): FixtureKey => ({
  orgId,
  fixtureId,
});

/**
 * Replay sessions (ADR-0013). The API creates sessions and validates
 * commands against persisted state; the worker owns playback and is the
 * authority on the resulting status, which reaches clients as `replay.status`.
 * Starting playback needs a free slot: the API answers 503 with `Retry-After`
 * at the limit rather than accepting work the worker would drop. Every
 * lookup is scoped to the caller's organisation (ADR-0018).
 */
@Injectable()
export class ReplayService {
  constructor(
    @Inject(APP_ENV) private readonly env: ApiEnv,
    @Inject(REPLAY_STORES) private readonly stores: ReplayStores,
    @Inject(REPLAY_COMMAND_BUS) private readonly bus: ReplayCommandBus,
    private readonly idempotency: IdempotencyService,
  ) {}

  async listTemplates(
    orgId: string,
  ): Promise<ItemList<FixtureTemplateSummary>> {
    return { items: await this.stores.templates.list(orgId) };
  }

  async listSessions(
    orgId: string,
    limit: number,
  ): Promise<ItemList<ReplaySessionView>> {
    return { items: await this.stores.sessions.list(orgId, limit) };
  }

  createSession(
    request: ReplayRequest & {
      templateId: string;
      speed: ReplaySpeed;
      faultPlan?: FaultPlan;
    },
  ): Promise<IdempotentResult<CreatedSession>> {
    const { templateId, speed, faultPlan } = request;
    // Simulated failures exist only where the operator enabled them (ADR-0020).
    if (faultPlan !== undefined && !this.env.DEMO_FAULTS_ENABLED)
      return Promise.reject(problem('demoFaultsDisabled'));
    return this.idempotent(
      request,
      {
        scope: IDEMPOTENCY_SCOPES.createSession,
        request: { templateId, speed, ...(faultPlan && { faultPlan }) },
        parse: (body) => CreatedSessionResponse.parse(body),
      },
      async () => ({
        status: HttpStatus.CREATED,
        body: await this.create(
          request.principal,
          templateId,
          speed,
          faultPlan,
        ),
      }),
    );
  }

  async status(orgId: string, sessionId: string): Promise<ReplayStatus> {
    return (await this.session(orgId, sessionId)).status;
  }

  /** 202 semantics: the returned status is the accepted target, confirmed later on the stream. */
  command(
    request: ReplayRequest & { sessionId: string; command: ReplayCommand },
  ): Promise<IdempotentResult<ReplayStatus>> {
    const { sessionId, command } = request;
    return this.idempotent(
      request,
      {
        scope: IDEMPOTENCY_SCOPES.replayCommand,
        request: { sessionId, command },
        parse: (body) => ReplayStatus.parse(body),
      },
      async () => ({
        status: HttpStatus.ACCEPTED,
        body: await this.apply(request.principal.orgId, sessionId, command),
      }),
    );
  }

  /** The key is stored only once the command is queued. */
  private idempotent<T>(
    request: ReplayRequest,
    scope: Omit<IdempotencyScope<T>, 'orgId' | 'key'>,
    work: () => Promise<{ status: number; body: T }>,
  ): Promise<IdempotentResult<T>> {
    return this.idempotency.run(
      {
        ...scope,
        orgId: request.principal.orgId,
        key: request.idempotencyKey,
      },
      work,
    );
  }

  private async create(
    principal: Principal,
    templateId: string,
    speed: ReplaySpeed,
    faultPlan?: FaultPlan,
  ): Promise<CreatedSession> {
    let created: CreatedSession | null;
    try {
      created = await this.stores.sessions.create({
        orgId: principal.orgId,
        actor: {
          id: principal.userId,
          type: actorTypeOf(principal),
          ...(principal.displayName === undefined
            ? {}
            : { displayName: principal.displayName }),
          details: actorDetails(principal),
        },
        templateId,
        speed,
        ...(faultPlan === undefined ? {} : { faultPlan }),
        capacity: {
          max: this.env.REPLAY_MAX_ACTIVE_SESSIONS,
          idleMs: this.env.REPLAY_IDLE_TIMEOUT_MS,
        },
      });
    } catch (error) {
      if (error instanceof SessionCapacityExceeded)
        throw capacityProblem(error.active, error.max);
      throw error;
    }
    if (created === null)
      throw problem('templateNotFound', { detail: templateId });
    await this.send(principal.orgId, created.fixture.fixtureId, {
      action: 'start',
      speed,
    });
    return created;
  }

  private async apply(
    orgId: string,
    sessionId: string,
    command: ReplayCommand,
  ): Promise<ReplayStatus> {
    const session = await this.session(orgId, sessionId);
    const template = (await this.stores.templates.list(orgId)).find(
      (t) => t.templateId === session.templateId,
    );
    if (template === undefined)
      throw problem('templateNotFound', { detail: session.templateId });
    const check = checkTransition(
      session.status,
      command,
      template.eventCount - 1,
    );
    if (!check.ok) throw problem('replayConflict', { detail: check.reason });
    if (needsSlot(command)) await this.ensureSlot(orgId, sessionId);
    await this.send(orgId, sessionId, command);
    return check.target;
  }

  /** Advisory: the worker re-checks when it applies the command. */
  private async ensureSlot(orgId: string, sessionId: string): Promise<void> {
    const max = this.env.REPLAY_MAX_ACTIVE_SESSIONS;
    const active = await this.stores.sessions.countActive({
      orgId,
      idleMs: this.env.REPLAY_IDLE_TIMEOUT_MS,
      excludeFixtureId: sessionId,
    });
    if (active >= max) throw capacityProblem(active, max);
  }

  /** Another organisation's session is indistinguishable from a missing one. */
  private async session(
    orgId: string,
    sessionId: string,
  ): Promise<ReplaySessionView> {
    const session = await this.stores.sessions.get(keyOf(orgId, sessionId));
    if (session === null)
      throw problem('sessionNotFound', { detail: sessionId });
    return session;
  }

  private async send(
    orgId: string,
    fixtureId: string,
    command: ReplayCommand,
  ): Promise<void> {
    try {
      await this.bus.send({ ...keyOf(orgId, fixtureId), command });
    } catch {
      throw problem('replayUnavailable', { detail: fixtureId });
    }
  }
}

import { Inject, Injectable } from '@nestjs/common';
import type { ApiEnv } from '@matchiq/config';
import type {
  ReplayCommand,
  ReplaySpeed,
  ReplayStatus,
} from '@matchiq/contracts';
import type {
  CreatedSession,
  FixtureKey,
  FixtureTemplateSummary,
  ReplayCommandBus,
  ReplaySessionView,
  SessionStore,
  TemplateStore,
} from '@matchiq/db';
import { APP_ENV } from '@matchiq/server-kit';
import { problem } from '../http/problems';
import {
  REPLAY_COMMAND_BUS,
  SESSION_STORE,
  TEMPLATE_STORE,
} from '../infrastructure/tokens';
import { checkTransition } from './replay-transitions';

export interface ItemList<T> {
  readonly items: T[];
}

/**
 * Replay sessions (ADR-0013). The API creates sessions and validates
 * commands against persisted state; the worker owns playback and is the
 * authority on the resulting status, which reaches clients as `replay.status`.
 */
@Injectable()
export class ReplayService {
  constructor(
    @Inject(APP_ENV) private readonly env: ApiEnv,
    @Inject(TEMPLATE_STORE) private readonly templates: TemplateStore,
    @Inject(SESSION_STORE) private readonly sessions: SessionStore,
    @Inject(REPLAY_COMMAND_BUS) private readonly bus: ReplayCommandBus,
  ) {}

  private keyOf(fixtureId: string): FixtureKey {
    return { orgId: this.env.DEMO_ORG_ID, fixtureId };
  }

  async listTemplates(): Promise<ItemList<FixtureTemplateSummary>> {
    return { items: await this.templates.list(this.env.DEMO_ORG_ID) };
  }

  async listSessions(limit: number): Promise<ItemList<ReplaySessionView>> {
    return { items: await this.sessions.list(this.env.DEMO_ORG_ID, limit) };
  }

  async createSession(
    templateId: string,
    speed: ReplaySpeed,
  ): Promise<CreatedSession> {
    const created = await this.sessions.create({
      orgId: this.env.DEMO_ORG_ID,
      templateId,
      speed,
    });
    if (created === null)
      throw problem('templateNotFound', { detail: templateId });
    await this.send(created.fixture.fixtureId, { action: 'start', speed });
    return created;
  }

  async status(sessionId: string): Promise<ReplayStatus> {
    return (await this.session(sessionId)).status;
  }

  /** 202 semantics: the returned status is the accepted target, confirmed later on the stream. */
  async command(
    sessionId: string,
    command: ReplayCommand,
  ): Promise<ReplayStatus> {
    const session = await this.session(sessionId);
    const template = (await this.templates.list(this.env.DEMO_ORG_ID)).find(
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
    await this.send(sessionId, command);
    return check.target;
  }

  private async session(sessionId: string): Promise<ReplaySessionView> {
    const session = await this.sessions.get(this.keyOf(sessionId));
    if (session === null)
      throw problem('sessionNotFound', { detail: sessionId });
    return session;
  }

  private async send(fixtureId: string, command: ReplayCommand): Promise<void> {
    try {
      await this.bus.send({ ...this.keyOf(fixtureId), command });
    } catch {
      throw problem('replayUnavailable', { detail: fixtureId });
    }
  }
}

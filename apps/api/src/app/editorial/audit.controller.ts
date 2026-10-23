import { Controller, Get, Header, Inject, Query } from '@nestjs/common';
import { AuditEventQuery, type AuditEventPage } from '@matchiq/contracts';
import type { AuditReader } from '@matchiq/db';
import { ZodValidationPipe } from '@matchiq/server-kit';
import type { Actor } from '../auth/actor';
import { CurrentActor, RequirePermission } from '../auth/permissions.guard';
import { CACHE_CONTROL, HEADER_NAMES, ROUTES } from '../constants';
import { readPage } from '../http/cursor-page';
import { AUDIT_READER } from '../infrastructure/tokens';

/** `GET /audit-events`: the caller's organisation only, newest first. */
@Controller(ROUTES.auditEvents)
export class AuditController {
  constructor(@Inject(AUDIT_READER) private readonly audits: AuditReader) {}

  @Get()
  @RequirePermission('audit:read')
  @Header(HEADER_NAMES.cacheControl, CACHE_CONTROL.noStore)
  list(
    @Query(new ZodValidationPipe(AuditEventQuery)) query: AuditEventQuery,
    @CurrentActor() actor: Actor,
  ): Promise<AuditEventPage> {
    return readPage(() => this.audits.list(actor.orgId, query));
  }
}

import {
  AuditEventPage,
  EditorialCommand,
  EditorialStatus,
  EditorialStatusResult,
  KillSwitchResult,
  KillSwitchStatus,
  RetractOverlayResult,
  SuppressInsightResult,
} from '@matchiq/contracts';
import type { z } from 'zod';
import { API_LIMITS, API_PATHS, HTTP_HEADERS } from '@/constants/api';
import { requestJson } from './http-client';

/** Every producer command carries a reason and an idempotency key (spec §45). */
export type CommandInput = { reason: string; idempotencyKey: string };

export type AuditFilters = {
  action?: string;
  actorType?: string;
  targetType?: string;
  targetId?: string;
  fixtureId?: string;
  from?: string;
  to?: string;
};

const command = <S extends z.ZodType>(
  path: string,
  schema: S,
  { reason, idempotencyKey }: CommandInput,
) =>
  requestJson(path, schema, {
    method: 'POST',
    body: EditorialCommand.parse({ reason }),
    headers: { [HTTP_HEADERS.idempotencyKey]: idempotencyKey },
  });

export const retractOverlay = (overlayId: string, input: CommandInput) =>
  command(API_PATHS.retract(overlayId), RetractOverlayResult, input);

export const suppressInsight = (insightId: string, input: CommandInput) =>
  command(API_PATHS.suppress(insightId), SuppressInsightResult, input);

export const freezeFixture = (fixtureId: string, input: CommandInput) =>
  command(API_PATHS.freeze(fixtureId), EditorialStatusResult, input);

export const resumeFixture = (fixtureId: string, input: CommandInput) =>
  command(API_PATHS.resume(fixtureId), EditorialStatusResult, input);

export const activateKillSwitch = (input: CommandInput) =>
  command(API_PATHS.killSwitchActivate, KillSwitchResult, input);

export const releaseKillSwitch = (input: CommandInput) =>
  command(API_PATHS.killSwitchRelease, KillSwitchResult, input);

export const fetchEditorialStatus = (fixtureId: string, signal?: AbortSignal) =>
  requestJson(API_PATHS.editorial(fixtureId), EditorialStatus, { signal });

export const fetchKillSwitch = (signal?: AbortSignal) =>
  requestJson(API_PATHS.killSwitch, KillSwitchStatus, { signal });

export const fetchAuditEvents = (
  filters: AuditFilters,
  cursor: string | undefined,
  signal?: AbortSignal,
) =>
  requestJson(API_PATHS.auditEvents, AuditEventPage, {
    signal,
    query: { ...filters, cursor, limit: API_LIMITS.auditPageSize },
  });

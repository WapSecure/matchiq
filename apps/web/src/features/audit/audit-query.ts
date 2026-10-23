import type { AuditFilters } from '@/lib/api/editorial-endpoints';

export type AuditScope = 'fixture' | 'org';

/** Form state; empty strings mean "any". `from`/`to` are UTC instants from the range picker. */
export type AuditFilterForm = {
  action: string;
  actorType: string;
  targetType: string;
  targetId: string;
  scope: AuditScope;
  from: string;
  to: string;
};

export const EMPTY_AUDIT_FILTERS: AuditFilterForm = {
  action: '',
  actorType: '',
  targetType: '',
  targetId: '',
  scope: 'fixture',
  from: '',
  to: '',
};

/** Normalises a parseable time (an ISO instant, or local wall time) to a UTC ISO string. */
export const toUtc = (local: string): string | undefined => {
  if (!local) return undefined;
  const ms = Date.parse(local);
  return Number.isNaN(ms) ? undefined : new Date(ms).toISOString();
};

const present = (value: string): string | undefined =>
  value.trim() === '' ? undefined : value.trim();

/**
 * Builds the `GET /audit-events` filters. `targetId` is sent only with a
 * target type, and a reversed range is swapped, matching the API's rules.
 */
export const toAuditQuery = (
  form: AuditFilterForm,
  fixtureId: string,
): AuditFilters => {
  const targetType = present(form.targetType);
  let from = toUtc(form.from);
  let to = toUtc(form.to);
  if (from && to && from > to) [from, to] = [to, from];
  const query: AuditFilters = {
    action: present(form.action),
    actorType: present(form.actorType),
    targetType,
    targetId: targetType ? present(form.targetId) : undefined,
    fixtureId: form.scope === 'fixture' ? fixtureId : undefined,
    from,
    to,
  };
  return Object.fromEntries(
    Object.entries(query).filter(([, value]) => value !== undefined),
  ) as AuditFilters;
};

export type FieldChange = { field: string; before: unknown; after: unknown };

const same = (a: unknown, b: unknown): boolean =>
  JSON.stringify(a) === JSON.stringify(b);

/** Fields whose value differs between the before and after states. */
export const diffStates = (
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): FieldChange[] => {
  const fields = new Set([
    ...Object.keys(before ?? {}),
    ...Object.keys(after ?? {}),
  ]);
  return [...fields]
    .sort()
    .map((field) => ({
      field,
      before: before?.[field],
      after: after?.[field],
    }))
    .filter((change) => !same(change.before, change.after));
};

import type { Route } from '@playwright/test';
import { FIXTURE_ID } from './mock-fixture';

const AUDIT_ID = '0b9c8e43-8f3e-4c43-9a34-0a5f8c3a1d11';

/** Producer commands the mocked API received, in order. */
export type EditorialRecorder = {
  path: string;
  body: unknown;
  key: string | null;
}[];

type Control = { active: boolean; changedAt: string | null };

/** Command results carry the time they were applied, so each is newer than the last. */
const control = (active: boolean): Control => ({
  active,
  changedAt: new Date().toISOString(),
});

const status = (freeze: Control, killSwitch: Control) => ({
  fixtureId: FIXTURE_ID,
  mode: killSwitch.active ? 'KILLED' : freeze.active ? 'FROZEN' : 'AUTO',
  freeze,
  killSwitch,
});

const IDLE: Control = { active: false, changedAt: null };

export const auditEvent = (n: number) => ({
  id: `0b9c8e43-8f3e-4c43-9a34-0a5f8c3a1d${String(n).padStart(2, '0')}`,
  action: n % 2 ? 'editorial.frozen' : 'overlay.retracted',
  actor:
    n % 2
      ? { type: 'OPERATOR', id: 'operator-key' }
      : { type: 'SYSTEM', id: 'overlay-scheduler' },
  target:
    n % 2
      ? { type: 'fixture', id: FIXTURE_ID }
      : { type: 'overlay', id: `ov_${n}` },
  fixtureId: FIXTURE_ID,
  reason: n % 2 ? `Producer note ${n}` : null,
  correlationId: null,
  requestId: null,
  before: { active: false },
  after: { active: true },
  details: {},
  at: new Date(Date.UTC(2026, 9, 24, 14, 60 - n)).toISOString(),
});

const auditPage = (url: URL) =>
  url.searchParams.get('cursor') === 'page-2'
    ? { items: [3, 4].map(auditEvent), nextCursor: null }
    : { items: [1, 2].map(auditEvent), nextCursor: 'page-2' };

const result = (path: string): unknown => {
  if (path.endsWith('/editorial/freeze'))
    return {
      status: status(control(true), IDLE),
      changed: true,
      auditId: AUDIT_ID,
    };
  if (path.endsWith('/editorial/resume'))
    return {
      status: status(control(false), IDLE),
      changed: true,
      auditId: AUDIT_ID,
    };
  if (path.includes('/kill-switch/'))
    return {
      killSwitch: control(path.endsWith('/activate')),
      changed: true,
      auditId: AUDIT_ID,
      fixtureIds: [FIXTURE_ID],
      retractedOverlayIds: [],
    };
  const overlayId = decodeURIComponent(path.split('/')[2] ?? '');
  return {
    overlayId,
    fixtureId: FIXTURE_ID,
    revision: 1,
    status: 'RETRACTED',
    changed: true,
    auditId: AUDIT_ID,
  };
};

/** Answers the editorial and audit routes; false when the path is not one of them. */
export const handleEditorial = (
  route: Route,
  path: string,
  recorder: EditorialRecorder,
  json: (route: Route, body: unknown, status?: number) => Promise<void>,
): Promise<void> | false => {
  const request = route.request();
  if (path === '/audit-events')
    return json(route, auditPage(new URL(request.url())));
  if (path.endsWith('/editorial') && request.method() === 'GET')
    return json(route, status(IDLE, IDLE));
  if (path === '/editorial/kill-switch')
    return json(route, { killSwitch: IDLE });
  const command =
    path.startsWith('/overlays/') ||
    path.startsWith('/insights/') ||
    path.includes('/editorial/');
  if (!command || request.method() !== 'POST') return false;
  recorder.push({
    path,
    body: request.postDataJSON(),
    key: request.headers()['idempotency-key'] ?? null,
  });
  return json(route, result(path));
};

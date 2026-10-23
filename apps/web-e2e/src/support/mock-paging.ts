import { mockSessions, mockTemplates } from './mock-session';

const SESSION_TOTAL = 11;
const TEMPLATE_TOTAL = 8;

/** A catalogue of eight matches: enough for a second numbered page at six per page. */
const manyTemplates = () => {
  const [base] = mockTemplates();
  return Array.from({ length: TEMPLATE_TOTAL }, (_, i) => ({
    ...base,
    templateId: `fx_paged-${i + 1}_42`,
    title: `Paged match ${i + 1}`,
  }));
};

const sessionNumbered = (n: number) => {
  const [base] = mockSessions();
  return {
    ...base,
    sessionId: `fx_paged_s${n}`,
    sessionNumber: n,
    title: `Paged replay ${n}`,
  };
};

/** Keyset pages of eleven replays, newest first, the way the API serves them. */
const sessionPage = (url: URL) => {
  const limit = Number(url.searchParams.get('limit') ?? '20');
  const start = Number(
    url.searchParams.get('cursor')?.replace('after-', '') ?? '0',
  );
  const numbers = Array.from(
    { length: Math.max(0, Math.min(limit, SESSION_TOTAL - start)) },
    (_, i) => SESSION_TOTAL - start - i,
  );
  const end = start + numbers.length;
  return {
    items: numbers.map(sessionNumbered),
    nextCursor: end < SESSION_TOTAL ? `after-${end}` : null,
    total: SESSION_TOTAL,
  };
};

export const pagedLobby = (path: string, url: URL) =>
  path === '/replay-sessions'
    ? sessionPage(url)
    : { items: manyTemplates(), nextCursor: null, total: TEMPLATE_TOTAL };

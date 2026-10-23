import type { AuditEvent } from '@matchiq/contracts';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createQueryClient } from '@/lib/api/query-provider';
import { FX, fixture } from '@/test/factories';
import { callsTo, stubApi } from '@/test/stub-api';
import {
  diffStates,
  EMPTY_AUDIT_FILTERS,
  toAuditQuery,
  toUtc,
} from './audit-query';
import { AuditView } from './audit-view';

const event = (n: number, overrides: Partial<AuditEvent> = {}): AuditEvent => ({
  id: `0b9c8e43-8f3e-4c43-9a34-0a5f8c3a1d${String(n).padStart(2, '0')}`,
  action: 'overlay.retracted',
  actor: { type: 'OPERATOR', id: 'operator-key' },
  target: { type: 'overlay', id: `ov_${n}` },
  fixtureId: FX,
  reason: `Reason ${n}`,
  correlationId: null,
  requestId: null,
  before: { status: 'LIVE', revision: 1 },
  after: { status: 'RETRACTED', revision: 1 },
  details: {},
  at: '2026-10-24T14:05:00.000Z',
  ...overrides,
});

describe('audit filters', () => {
  it('drops empty fields and scopes to the session by default', () => {
    expect(toAuditQuery(EMPTY_AUDIT_FILTERS, FX)).toEqual({ fixtureId: FX });
    expect(
      toAuditQuery(
        { ...EMPTY_AUDIT_FILTERS, scope: 'org', actorType: 'SYSTEM' },
        FX,
      ),
    ).toEqual({ actorType: 'SYSTEM' });
  });

  it('sends a target id only with a target type', () => {
    const form = { ...EMPTY_AUDIT_FILTERS, targetId: 'ov_1' };
    expect(toAuditQuery(form, FX)).not.toHaveProperty('targetId');
    expect(toAuditQuery({ ...form, targetType: 'overlay' }, FX)).toMatchObject({
      targetType: 'overlay',
      targetId: 'ov_1',
    });
  });

  it('converts local times to UTC and orders the range', () => {
    const early = '2026-10-24T10:00';
    const late = '2026-10-24T12:00';
    const query = toAuditQuery(
      { ...EMPTY_AUDIT_FILTERS, from: late, to: early },
      FX,
    );
    expect(query.from).toBe(toUtc(early));
    expect(query.to).toBe(toUtc(late));
    expect(query.from).toMatch(/Z$/);
  });

  it('diffs before and after per changed field', () => {
    expect(
      diffStates(
        { status: 'LIVE', revision: 1 },
        { status: 'RETRACTED', revision: 1 },
      ),
    ).toEqual([{ field: 'status', before: 'LIVE', after: 'RETRACTED' }]);
    expect(diffStates(null, { active: true })).toEqual([
      { field: 'active', before: undefined, after: true },
    ]);
  });
});

describe('AuditView', () => {
  afterEach(() => vi.unstubAllGlobals());

  const renderView = () =>
    render(
      <QueryClientProvider client={createQueryClient()}>
        <AuditView fixture={fixture()} />
      </QueryClientProvider>,
    );

  it('renders a table and pages older events with the cursor', async () => {
    const api = stubApi({
      'GET /audit-events': (url) =>
        url.searchParams.get('cursor') === 'c1'
          ? { body: { items: [event(2)], nextCursor: null } }
          : { body: { items: [event(1)], nextCursor: 'c1' } },
    });
    renderView();
    const table = await screen.findByRole('table', { name: /1 shown, more/ });
    expect(
      within(table).getByRole('rowheader', { name: /Graphic taken off air/ }),
    ).toBeInTheDocument();
    expect(within(table).getByText('Reason 1')).toBeInTheDocument();
    expect(within(table).getByText('1 field changed')).toBeInTheDocument();
    const first = new URL(String(callsTo(api, '/audit-events')[0]?.[0]));
    expect(first.searchParams.get('fixtureId')).toBe(FX);

    await userEvent.click(screen.getByRole('button', { name: 'Load more' }));
    await waitFor(() =>
      expect(screen.getByText('Reason 2')).toBeInTheDocument(),
    );
    expect(screen.getByText('End of the activity log.')).toBeInTheDocument();
  });

  it('names a person by display name and keeps the id as detail', async () => {
    const id = 'da1bb4b2-7c1e-4a51-9d0f-2f6d1c0b9e11';
    stubApi({
      'GET /audit-events': {
        body: {
          items: [
            event(1, {
              actor: { type: 'USER', id },
              actorDisplayName: 'Pat Producer',
            }),
            event(2),
          ],
          nextCursor: null,
        },
      },
    });
    renderView();
    const table = await screen.findByRole('table', { name: /Activity/ });
    expect(within(table).getByText('Pat Producer')).toBeInTheDocument();
    expect(within(table).getAllByText('Person')[0]).toBeInTheDocument();
    const technical = within(table).getAllByTestId('technical-details');
    expect(technical[0]).toHaveTextContent(id);
    expect(within(table).getByText('operator-key')).toBeInTheDocument();
  });

  it('applies filters on submit', async () => {
    const api = stubApi({
      'GET /audit-events': { body: { items: [event(1)], nextCursor: null } },
    });
    renderView();
    await screen.findByRole('table', { name: /Activity/ });
    await userEvent.click(screen.getByRole('button', { name: /Who$/ }));
    await userEvent.click(screen.getByRole('option', { name: 'Automatic' }));
    await userEvent.click(
      screen.getByRole('button', { name: 'Apply filters' }),
    );
    await waitFor(() => {
      const last = callsTo(api, '/audit-events').at(-1)?.[0];
      expect(new URL(String(last)).searchParams.get('actorType')).toBe(
        'SYSTEM',
      );
    });
  });

  it('sends a date preset as a UTC window', async () => {
    const api = stubApi({
      'GET /audit-events': { body: { items: [event(1)], nextCursor: null } },
    });
    renderView();
    await screen.findByRole('table', { name: /Activity/ });
    await userEvent.click(
      screen.getByRole('button', { name: /When.*Any time/ }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Last 15 minutes' }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Apply filters' }),
    );
    await waitFor(() => {
      const last = callsTo(api, '/audit-events').at(-1)?.[0];
      const params = new URL(String(last)).searchParams;
      const from = Date.parse(params.get('from') ?? '');
      const to = Date.parse(params.get('to') ?? '');
      expect(params.get('to')).toMatch(/Z$/);
      expect(to - from).toBe(15 * 60 * 1000);
    });
  });
});

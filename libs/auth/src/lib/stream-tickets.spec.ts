import { buildPrincipal, can } from '@matchiq/access';
import { StreamTickets } from './stream-tickets';

const producer = buildPrincipal({
  kind: 'user',
  userId: 'u-1',
  orgId: 'org_harbour',
  roles: ['producer'],
  scopes: [],
});

describe('StreamTickets', () => {
  let clock = new Date('2026-10-22T12:00:00Z');
  const tickets = new StreamTickets({
    secret: 's'.repeat(32),
    ttlSeconds: 60,
    now: () => clock,
  });

  beforeEach(() => {
    clock = new Date('2026-10-22T12:00:00Z');
  });

  it('round-trips the caller and organisation for the bound fixture', async () => {
    const { ticket, expiresAt } = await tickets.issue(producer, 'fx_1_s1');
    expect(expiresAt).toBe('2026-10-22T12:01:00.000Z');
    const outcome = await tickets.verify(ticket, 'fx_1_s1');
    expect(outcome.ok && outcome.principal).toMatchObject({
      userId: 'u-1',
      orgId: 'org_harbour',
      roles: ['producer'],
    });
  });

  it('grants only stream access, whatever the issuing roles allow', async () => {
    const { ticket } = await tickets.issue(producer, 'fx_1_s1');
    const outcome = await tickets.verify(ticket, 'fx_1_s1');
    if (!outcome.ok) throw new Error('expected a principal');
    expect(outcome.principal.permissions).toEqual(['fixtures:read']);
    expect(can(outcome.principal, 'editorial:publish')).toBe(false);
  });

  it('refuses a ticket presented for another fixture', async () => {
    const { ticket } = await tickets.issue(producer, 'fx_1_s1');
    expect(await tickets.verify(ticket, 'fx_1_s2')).toEqual({
      ok: false,
      reason: 'ticket-not-for-this-stream',
    });
  });

  it('expires after the TTL', async () => {
    const { ticket } = await tickets.issue(producer, 'fx_1_s1');
    clock = new Date('2026-10-22T12:01:01Z');
    expect(await tickets.verify(ticket, 'fx_1_s1')).toEqual({
      ok: false,
      reason: 'expired',
    });
  });

  it('rejects tickets signed with another secret or altered', async () => {
    const other = new StreamTickets({ secret: 'o'.repeat(32), ttlSeconds: 60 });
    const { ticket } = await other.issue(producer, 'fx_1_s1');
    expect((await tickets.verify(ticket, 'fx_1_s1')).ok).toBe(false);
    const mine = (await tickets.issue(producer, 'fx_1_s1')).ticket;
    const altered = `${mine.slice(0, -2)}xx`;
    expect((await tickets.verify(altered, 'fx_1_s1')).ok).toBe(false);
  });
});

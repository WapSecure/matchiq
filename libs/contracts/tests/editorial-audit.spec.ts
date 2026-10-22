import {
  AuditEvent,
  AuditEventQuery,
  EditorialCommand,
  StreamMessage,
} from '../src/index.js';

const envelope = {
  schemaVersion: 1,
  streamSequence: 7,
  fixtureId: 'fx_comeback_42_s1',
  emittedAt: '2026-10-22T10:00:00.000Z',
} as const;

describe('EditorialCommand', () => {
  it('trims the reason and enforces its bounds', () => {
    expect(EditorialCommand.parse({ reason: '  wrong score  ' })).toEqual({
      reason: 'wrong score',
    });
    expect(EditorialCommand.safeParse({ reason: '  ' }).success).toBe(false);
    expect(
      EditorialCommand.safeParse({ reason: 'x'.repeat(281) }).success,
    ).toBe(false);
    expect(
      EditorialCommand.safeParse({ reason: 'ok!', extra: 1 }).success,
    ).toBe(false);
  });
});

describe('editorial stream messages', () => {
  it('accepts editorial.status without actor or reason', () => {
    const message = {
      ...envelope,
      type: 'editorial.status',
      payload: {
        fixtureId: envelope.fixtureId,
        mode: 'FROZEN',
        freeze: { active: true, changedAt: envelope.emittedAt },
        killSwitch: { active: false, changedAt: null },
      },
    };
    expect(StreamMessage.safeParse(message).success).toBe(true);
    expect(
      StreamMessage.safeParse({
        ...message,
        payload: { ...message.payload, reason: 'internal' },
      }).success,
    ).toBe(false);
  });

  it('keeps overlay.retract backwards compatible and validates its cause', () => {
    const retract = {
      ...envelope,
      type: 'overlay.retract',
      payload: { overlayId: 'ov_1', revision: 1, reason: 'expired' },
    };
    expect(StreamMessage.safeParse(retract).success).toBe(true);
    const producer = {
      ...retract,
      payload: { ...retract.payload, cause: 'PRODUCER' },
    };
    expect(StreamMessage.safeParse(producer).success).toBe(true);
    expect(
      StreamMessage.safeParse({
        ...retract,
        payload: { ...retract.payload, cause: 'BORED' },
      }).success,
    ).toBe(false);
  });
});

describe('audit contracts', () => {
  const event = {
    id: '0b9f6a3e-2f7c-4d0c-9a51-8d6f1c2e3b4a',
    action: 'overlay.retracted',
    actor: { type: 'OPERATOR', id: 'operator' },
    target: { type: 'overlay', id: 'ov_1' },
    fixtureId: 'fx_comeback_42_s1',
    reason: 'wrong score',
    correlationId: 'req-12345678',
    requestId: 'req-12345678',
    before: { status: 'LIVE' },
    after: { status: 'RETRACTED' },
    details: {},
    at: '2026-10-22T10:00:00.000Z',
  };

  it('accepts a complete audit event and rejects a malformed action', () => {
    expect(AuditEvent.safeParse(event).success).toBe(true);
    expect(
      AuditEvent.safeParse({ ...event, action: 'Overlay Retracted' }).success,
    ).toBe(false);
  });

  it('defaults the page size and rejects inconsistent filters', () => {
    expect(AuditEventQuery.parse({}).limit).toBe(50);
    expect(AuditEventQuery.parse({ limit: '10' }).limit).toBe(10);
    expect(AuditEventQuery.safeParse({ limit: '500' }).success).toBe(false);
    expect(AuditEventQuery.safeParse({ targetId: 'ov_1' }).success).toBe(false);
    expect(
      AuditEventQuery.safeParse({
        from: '2026-10-02T00:00:00Z',
        to: '2026-10-01T00:00:00Z',
      }).success,
    ).toBe(false);
  });
});

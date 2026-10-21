import {
  OVERLAY_TRANSITIONS,
  OverlayCue,
  OverlayStatus,
  StreamMessage,
  canTransitionOverlay,
} from '../src/index.js';
import { buildShot } from './builders.js';

const cue = {
  schemaVersion: 1,
  overlayId: 'ov_fx42_000134',
  fixtureId: 'fx_comeback_42',
  revision: 1,
  kind: 'TACTICAL_INSIGHT',
  priority: 70,
  persona: 'BROADCAST',
  locale: 'en-GB',
  clockStartMs: 3_742_000,
  clockEndMs: 3_749_000,
  maxDisplayMs: 8_000,
  headline: 'Pressure building on the left',
  body: 'Five recoveries in the last six minutes led to three shots.',
  evidenceEventIds: ['ev_00101', 'ev_00112'],
  metricRefs: ['recoveries.home.rolling6m'],
  safeArea: { topPct: 8, rightPct: 6, bottomPct: 10, leftPct: 6 },
  status: 'APPROVED',
  synthetic: true,
} as const;

describe('OverlayCue', () => {
  it('accepts a cue inside its display budget', () => {
    expect(OverlayCue.safeParse(cue).success).toBe(true);
  });

  it('rejects an end clock before the start clock', () => {
    expect(
      OverlayCue.safeParse({ ...cue, clockEndMs: cue.clockStartMs }).success,
    ).toBe(false);
  });

  it('rejects a window longer than maxDisplayMs', () => {
    expect(
      OverlayCue.safeParse({ ...cue, clockEndMs: cue.clockStartMs + 9_000 })
        .success,
    ).toBe(false);
  });

  it('requires at least one evidence event', () => {
    expect(OverlayCue.safeParse({ ...cue, evidenceEventIds: [] }).success).toBe(
      false,
    );
  });
});

describe('overlay state machine', () => {
  it('defines transitions for every status', () => {
    expect(Object.keys(OVERLAY_TRANSITIONS).sort()).toEqual(
      [...OverlayStatus.options].sort(),
    );
  });

  it('treats terminal states as final', () => {
    for (const terminal of ['EXPIRED', 'RETRACTED', 'FAILED'] as const) {
      for (const next of OverlayStatus.options) {
        expect(canTransitionOverlay(terminal, next)).toBe(false);
      }
    }
  });

  it('allows retraction from every non-terminal state', () => {
    for (const status of [
      'DRAFT',
      'VERIFIED',
      'APPROVED',
      'AUTO_APPROVED',
      'SCHEDULED',
      'LIVE',
    ] as const) {
      expect(canTransitionOverlay(status, 'RETRACTED')).toBe(true);
    }
  });

  it('forbids going live without scheduling', () => {
    expect(canTransitionOverlay('APPROVED', 'LIVE')).toBe(false);
  });
});

describe('StreamMessage', () => {
  const envelope = {
    schemaVersion: 1,
    streamSequence: 7,
    fixtureId: 'fx_comeback_42',
    emittedAt: '2026-10-20T19:31:00Z',
  } as const;

  it('validates the payload against the message type', () => {
    expect(
      StreamMessage.safeParse({
        ...envelope,
        type: 'match.event',
        payload: buildShot(3),
      }).success,
    ).toBe(true);
    expect(
      StreamMessage.safeParse({
        ...envelope,
        type: 'overlay.publish',
        payload: buildShot(3),
      }).success,
    ).toBe(false);
  });

  it('accepts heartbeats with an empty payload only', () => {
    expect(
      StreamMessage.safeParse({ ...envelope, type: 'heartbeat', payload: {} })
        .success,
    ).toBe(true);
    expect(
      StreamMessage.safeParse({
        ...envelope,
        type: 'heartbeat',
        payload: { x: 1 },
      }).success,
    ).toBe(false);
  });
});

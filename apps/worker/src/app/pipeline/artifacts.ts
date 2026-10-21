import {
  SCHEMA_VERSION,
  type EntityAllowlist,
  type Fixture,
  type Insight,
  type Narrative,
  type NarrativeDraft,
  type OverlayCue,
  type OverlayProposal,
} from '@matchiq/contracts';
import { sha256Hex } from '@matchiq/db';
import {
  DEFAULT_SAFE_AREA,
  ID_HASH_LENGTH,
  ID_PARTS_SEPARATOR,
  ID_PREFIXES,
  OVERLAY_PERSONA,
  OVERLAY_TIMING,
  PRIMARY_LOCALE,
} from '../constants';

const digest = (...parts: readonly (string | number)[]): string =>
  sha256Hex(parts.join(ID_PARTS_SEPARATOR)).slice(0, ID_HASH_LENGTH);

/** Stable per insight, so a retried publication reuses the same cue id. */
export const overlayIdFor = (insightId: string): string =>
  `${ID_PREFIXES.overlay}${digest('overlay', insightId)}`;

export const narrativeIdFor = (
  insightId: string,
  draft: Pick<NarrativeDraft, 'persona' | 'locale' | 'source'>,
): string =>
  `${ID_PREFIXES.narrative}${digest(insightId, draft.persona, draft.locale, draft.source)}`;

export const runIdFor = (
  fixtureId: string,
  insightId: string,
  revision: number,
) => `${ID_PREFIXES.run}${digest('run', fixtureId, insightId, revision)}`;

/** A name-based UUID (RFC 9562 version 8) so retries share one correlation id. */
export const correlationIdFor = (
  fixtureId: string,
  insightId: string,
  revision: number,
): string => {
  const hex = sha256Hex(
    [fixtureId, insightId, revision].join(ID_PARTS_SEPARATOR),
  );
  const variant = ((parseInt(hex.charAt(16), 16) & 0x3) | 0x8).toString(16);
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `8${hex.slice(13, 16)}`,
    `${variant}${hex.slice(17, 20)}`,
    hex.slice(20, 32),
  ].join('-');
};

export const allowlistOf = (fixture: Fixture): EntityAllowlist => ({
  teams: [fixture.home, fixture.away].map((t) => ({
    teamId: t.teamId,
    name: t.name,
  })),
  players: [...fixture.home.players, ...fixture.away.players].map((p) => ({
    playerId: p.playerId,
    teamId: p.teamId,
    displayName: p.displayName,
  })),
});

export const toNarrative = (
  insight: Insight,
  draft: NarrativeDraft,
  createdAt: string,
): Narrative => ({
  schemaVersion: SCHEMA_VERSION,
  narrativeId: narrativeIdFor(insight.insightId, draft),
  fixtureId: insight.fixtureId,
  insightId: insight.insightId,
  persona: draft.persona,
  locale: draft.locale,
  headline: draft.headline,
  body: draft.body,
  citations: [...draft.evidenceEventIds],
  source: draft.source,
  localeFallback: draft.localeFallback,
  createdAt,
});

/** Spec §44 cue: starts at the insight's match clock, AUTO_APPROVED by the gate policy. */
export const toOverlayCue = (
  insight: Insight,
  proposal: OverlayProposal,
  revision: number,
): OverlayCue => ({
  schemaVersion: SCHEMA_VERSION,
  overlayId: overlayIdFor(insight.insightId),
  fixtureId: insight.fixtureId,
  insightId: insight.insightId,
  revision,
  kind: proposal.kind,
  priority: proposal.priority,
  persona: OVERLAY_PERSONA,
  locale: PRIMARY_LOCALE,
  clockStartMs: insight.matchClockMs,
  clockEndMs:
    insight.matchClockMs +
    Math.min(proposal.durationMs, OVERLAY_TIMING.maxDisplayMs),
  maxDisplayMs: OVERLAY_TIMING.maxDisplayMs,
  headline: proposal.headline,
  body: proposal.body,
  evidenceEventIds: [...proposal.evidenceEventIds],
  metricRefs: [...proposal.metricRefs],
  safeArea: DEFAULT_SAFE_AREA,
  status: 'AUTO_APPROVED',
  synthetic: true,
});

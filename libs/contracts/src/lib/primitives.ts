import { z } from 'zod';
import {
  ID_BODY_PATTERN,
  ID_PREFIX,
  LIMITS,
  MESSAGES,
  PATTERNS,
  SCHEMA_VERSION,
} from './constants.js';

export const SchemaVersion = z.literal(SCHEMA_VERSION);

export const prefixedId = (prefix: string) =>
  z.string().regex(new RegExp(`^${prefix}_${ID_BODY_PATTERN}$`), {
    message: MESSAGES.prefixedId(prefix),
  });

export const OrgId = prefixedId(ID_PREFIX.org);
export const FixtureId = prefixedId(ID_PREFIX.fixture);
export const TeamId = prefixedId(ID_PREFIX.team);
export const PlayerId = prefixedId(ID_PREFIX.player);
export const EventId = prefixedId(ID_PREFIX.event);
export const InsightId = prefixedId(ID_PREFIX.insight);
export const NarrativeId = prefixedId(ID_PREFIX.narrative);
export const OverlayId = prefixedId(ID_PREFIX.overlay);
export const RunId = prefixedId(ID_PREFIX.run);
export const CorrelationId = z.uuid();

export const UtcTimestamp = z.iso.datetime({ offset: false });

/** Milliseconds elapsed on the match clock within the current period. */
export const MatchClockMs = z.int().nonnegative();

/** 1-2 regulation halves, 3-4 extra time, 5 penalty shoot-out. */
export const Period = z.int().min(1).max(LIMITS.periodMax);

/**
 * Normalised pitch coordinates: x runs 0..100 towards the attacked goal of the
 * acting team, y runs 0..100 from that team's right touchline.
 */
export const PitchPoint = z
  .strictObject({
    x: z.number().min(0).max(LIMITS.pitchCoordinateMax),
    y: z.number().min(0).max(LIMITS.pitchCoordinateMax),
  })
  .meta({ id: 'PitchPoint' });

export const Locale = z.enum(['en-GB', 'fr-FR', 'es-ES']);
export const Persona = z.enum(['CASUAL', 'ANALYST', 'BROADCAST']);
export const ConfidenceLabel = z.enum(['low', 'medium', 'high']);
export const MetricRef = z
  .string()
  .regex(PATTERNS.metricRef, { message: MESSAGES.metricRef });
export const SemVer = z.string().regex(PATTERNS.semVer);

export const Provenance = z
  .discriminatedUnion('kind', [
    z
      .strictObject({
        kind: z.literal('synthetic'),
        generatorVersion: SemVer,
        seed: z.int().nonnegative(),
        scenario: z.string().min(1).max(64),
      })
      .meta({ id: 'SyntheticProvenance' }),
  ])
  .meta({ id: 'Provenance' });

export type OrgId = z.infer<typeof OrgId>;
export type FixtureId = z.infer<typeof FixtureId>;
export type TeamId = z.infer<typeof TeamId>;
export type PlayerId = z.infer<typeof PlayerId>;
export type EventId = z.infer<typeof EventId>;
export type InsightId = z.infer<typeof InsightId>;
export type NarrativeId = z.infer<typeof NarrativeId>;
export type OverlayId = z.infer<typeof OverlayId>;
export type RunId = z.infer<typeof RunId>;
export type PitchPoint = z.infer<typeof PitchPoint>;
export type Locale = z.infer<typeof Locale>;
export type Persona = z.infer<typeof Persona>;
export type ConfidenceLabel = z.infer<typeof ConfidenceLabel>;
export type MetricRef = z.infer<typeof MetricRef>;
export type Provenance = z.infer<typeof Provenance>;

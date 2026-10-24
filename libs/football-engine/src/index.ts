export {
  ALGORITHM_VERSION,
  HIGH_RECOVERY_MIN_X,
  MOMENT_METHOD_VERSION,
  MOMENT_THRESHOLDS,
  MOMENTUM_REFERENCE,
  MOMENTUM_WEIGHTS,
  WINDOW_SUFFIX,
  WINDOWS,
} from './lib/constants.js';
export type { FixtureContext, ProjectionState, Side } from './lib/types.js';
export { createInitialState } from './lib/projection/initial-state.js';
export {
  applyEvent,
  countableEvents,
  hasSequenceGap,
  project,
} from './lib/projection/projector.js';
export { toSnapshot } from './lib/projection/snapshot.js';
export {
  METRIC_DEFINITIONS,
  getMetricDefinition,
} from './lib/metrics/registry.js';
export {
  rollingMetrics,
  type MetricRecord,
} from './lib/metrics/window-metrics.js';
export {
  createMomentCursor,
  detectKeyMoments,
  redetectMoments,
  stepMoments,
} from './lib/moments/detect.js';
export type { MomentCursor } from './lib/moments/types.js';
export { CONTEXT_METHOD_VERSION, KEY_METRIC } from './lib/context/constants.js';
export {
  matchMinute,
  minutePhase,
  type ClockPoint,
} from './lib/context/clock.js';
export {
  directionOf,
  precedingRegain,
  previousMoment,
  scoreFact,
  trendFact,
  windowFact,
} from './lib/context/facts.js';
export { derivedAt } from './lib/context/derived-at.js';
export {
  momentContext,
  type MomentContextInput,
} from './lib/context/moment-context.js';
export {
  verifyCitedValues,
  verifyEvidenceIds,
  type CitedValueIssue,
  type CitedValueIssueReason,
} from './lib/evidence/verify.js';
export * from './player.js';

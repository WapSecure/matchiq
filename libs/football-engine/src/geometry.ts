/**
 * Browser-safe entry: pure pass and shot geometry (ADR-0040). The root entry
 * also exports hashing, which needs `node:crypto`, so the web app imports the
 * formulas from here instead of copying them.
 */
export {
  passDifficulty,
  passDistanceM,
  xgBaseline,
} from './lib/metrics/geometry.js';

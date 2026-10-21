export { GENERATOR_VERSION, SCENARIO_NAMES } from './lib/constants.js';
export { createRng, type Rng } from './lib/prng.js';
export { SCENARIOS, isScenarioName } from './lib/scenarios.js';
export type {
  Formation,
  ScenarioName,
  ScenarioPreset,
  Score,
  ScriptedBeat,
  Side,
  TeamProfile,
} from './lib/types.js';
export { buildFixture } from './lib/fixture-builder.js';
export {
  type GenerateMatchOptions,
  type GeneratedMatch,
  generateMatch,
} from './lib/engine/generate-match.js';
export { canonicalJson, hashEvents, sha256Hex } from './lib/hash.js';
export {
  FIXTURE_ISSUE_CODES,
  type FixtureIssue,
  type FixtureIssueCode,
  type ValidationReport,
} from './lib/validation/issues.js';
export {
  type ValidatedStream,
  analyseFixtureEvents,
  validateFixtureEvents,
} from './lib/validation/validate-events.js';
export {
  type FixtureFile,
  FixtureManifest,
  generateFixtureFile,
  serializeFixtureFile,
  validateFixtureFile,
} from './lib/fixture-file.js';

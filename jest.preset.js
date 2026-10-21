const nxPreset = require('@nx/jest/preset').default;

module.exports = {
  ...nxPreset,
  testEnvironmentOptions: {
    customExportConditions: ['@matchiq/source', 'node', 'require', 'default'],
  },
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
};

/** Jest config shared by NestJS projects: SWC with decorator metadata, CJS output. */
const swcOptions = {
  swcrc: false,
  jsc: {
    target: 'es2022',
    parser: { syntax: 'typescript', decorators: true, dynamicImport: true },
    transform: { decoratorMetadata: true, legacyDecorator: true },
    keepClassNames: true,
  },
  module: { type: 'commonjs' },
  sourceMaps: 'inline',
};

module.exports = function createNestJestConfig(displayName) {
  return {
    displayName,
    preset: '../../jest.preset.js',
    testEnvironment: 'node',
    transform: { '^.+\\.[tj]s$': ['@swc/jest', swcOptions] },
    // jose ships ESM only; transpile it like source so Jest can require it.
    transformIgnorePatterns: ['/node_modules/(?!(\\.pnpm/jose@|jose/))'],
    moduleFileExtensions: ['ts', 'js'],
    coverageDirectory: 'test-output/jest/coverage',
  };
};

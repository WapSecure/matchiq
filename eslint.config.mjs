import nx from '@nx/eslint-plugin';

const FRAMEWORK_IMPORTS = [
  '@nestjs/*',
  'next',
  'next/*',
  'react',
  'react-dom',
  'pg',
  'ioredis',
  'bullmq',
  'drizzle-orm',
  'drizzle-orm/*',
];

const depConstraints = [
  { sourceTag: 'type:app', notDependOnLibsWithTags: ['type:app'] },
  { sourceTag: 'type:contract', onlyDependOnLibsWithTags: ['type:contract'] },
  {
    sourceTag: 'type:util',
    onlyDependOnLibsWithTags: ['type:contract', 'type:util'],
  },
  {
    sourceTag: 'type:domain',
    onlyDependOnLibsWithTags: ['type:contract', 'type:util', 'type:domain'],
    bannedExternalImports: FRAMEWORK_IMPORTS,
  },
  {
    sourceTag: 'type:data-access',
    onlyDependOnLibsWithTags: [
      'type:contract',
      'type:util',
      'type:domain',
      'type:data-access',
    ],
  },
  {
    sourceTag: 'type:ui',
    onlyDependOnLibsWithTags: ['type:contract', 'type:util', 'type:ui'],
  },
  { sourceTag: 'scope:shared', onlyDependOnLibsWithTags: ['scope:shared'] },
  {
    sourceTag: 'scope:server',
    onlyDependOnLibsWithTags: ['scope:shared', 'scope:server'],
  },
  {
    sourceTag: 'scope:web',
    onlyDependOnLibsWithTags: ['scope:shared', 'scope:web'],
  },
  {
    sourceTag: 'scope:api',
    onlyDependOnLibsWithTags: ['scope:shared', 'scope:server', 'scope:api'],
  },
  {
    sourceTag: 'scope:worker',
    onlyDependOnLibsWithTags: ['scope:shared', 'scope:server', 'scope:worker'],
  },
];

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: [
      '**/dist',
      '**/out-tsc',
      '**/test-output',
      '**/generated',
      '**/.next',
      '**/vitest.config.*.timestamp*',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: [
            '^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$',
            '^.*/tools/(jest|webpack)/.*\\.cjs$',
          ],
          depConstraints,
        },
      ],
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.cts', '**/*.mts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        { 'ts-expect-error': 'allow-with-description' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { fixStyle: 'inline-type-imports' },
      ],
      'no-console': ['error', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
      complexity: ['error', 12],
      'max-depth': ['error', 3],
      'max-params': ['error', 4],
      'max-lines': [
        'error',
        { max: 250, skipBlankLines: true, skipComments: true },
      ],
      'max-lines-per-function': [
        'error',
        { max: 80, skipBlankLines: true, skipComments: true, IIFEs: true },
      ],
    },
  },
  {
    files: ['**/*.tsx'],
    rules: {
      'max-lines': [
        'error',
        { max: 150, skipBlankLines: true, skipComments: true },
      ],
    },
  },
  {
    files: ['**/*.spec.ts', '**/*.spec.tsx', '**/*.test.ts', '**/tests/**'],
    rules: {
      'max-lines-per-function': 'off',
      'max-lines': ['error', { max: 400, skipBlankLines: true }],
    },
  },
];

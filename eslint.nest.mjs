export default [
  {
    files: ['**/*.ts'],
    rules: {
      // Nest DI reads constructor parameter types from decorator metadata, which type-only imports erase.
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },
];

# ADR-0009: Test runners

- Status: Accepted (2026-10-21)

## Decision

Vitest for TypeScript libraries and the web app. Jest with SWC for NestJS projects, because decorator metadata, which Nest DI requires, is supported by SWC and not by Vite's default transform. pytest for Python. Playwright with axe-core for e2e and accessibility. Shared Nest Jest config lives in `tools/jest/nest-jest-config.cjs`.

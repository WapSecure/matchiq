import type { z } from 'zod';
import { PROD_ENVIRONMENT } from './auth-constants.js';
import { booleanFlag } from './fields.js';

export const DEMO_FAULTS_MESSAGES = {
  inProd: 'must be false when APP_ENV=prod (ADR-0017)',
} as const;

/** Accepts per-session demo fault plans (ADR-0017). Simulated failures only. */
export const DemoFaultFields = { DEMO_FAULTS_ENABLED: booleanFlag };

/** Demo faults are refused at startup in prod, like the mock model provider. */
export const checkDemoFaults = (
  env: { APP_ENV: string; DEMO_FAULTS_ENABLED: boolean },
  ctx: z.RefinementCtx,
): void => {
  if (env.APP_ENV === PROD_ENVIRONMENT && env.DEMO_FAULTS_ENABLED)
    ctx.addIssue({
      code: 'custom',
      path: ['DEMO_FAULTS_ENABLED'],
      message: DEMO_FAULTS_MESSAGES.inProd,
    });
};

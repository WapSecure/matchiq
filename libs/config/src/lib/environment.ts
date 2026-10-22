import { z } from 'zod';

export const AppEnvironment = z.enum(['local', 'test', 'dev', 'stage', 'prod']);
export type AppEnvironment = z.infer<typeof AppEnvironment>;

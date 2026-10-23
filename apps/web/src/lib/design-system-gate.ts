import { PROD_ENVIRONMENT } from '@matchiq/config';
import { webServerEnv } from '@/lib/auth/server/env';
import { PUBLIC_ENV } from '@/lib/env';

/** The component gallery is for review: on outside production, and in the public demo. */
export const isGalleryEnabled = (): boolean =>
  PUBLIC_ENV.NEXT_PUBLIC_DEMO_MODE ||
  webServerEnv().APP_ENV !== PROD_ENVIRONMENT;

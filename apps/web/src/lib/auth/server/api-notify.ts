import { AUTH_LIMITS, BFF } from '@/constants/auth';
import type { OidcSettings } from './env';

export type AuthEvent = 'sign-in' | 'sign-out';

/**
 * Records sign-in and sign-out in the API's audit trail with the user's own
 * token (ADR-0018). Best effort: an unreachable API never blocks signing in.
 */
export const notifyApi = async (
  env: OidcSettings,
  accessToken: string,
  event: AuthEvent,
): Promise<void> => {
  try {
    await fetch(`${env.API_INTERNAL_BASE_URL}/me/${event}`, {
      method: 'POST',
      headers: { [BFF.authorization]: `${BFF.bearer}${accessToken}` },
      signal: AbortSignal.timeout(AUTH_LIMITS.apiNotifyTimeoutMs),
    });
  } catch {
    // Audit is best effort from the web tier; the API audits its own actions.
  }
};

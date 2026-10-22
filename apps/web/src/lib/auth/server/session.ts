import type { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AUTH_COOKIES, AUTH_LIMITS } from '@/constants/auth';
import { cookieName, isSecureOrigin, type OidcSettings } from './env';
import { chunk, seal, unseal } from './seal';

export const SessionUser = z.object({
  sub: z.string().min(1),
  name: z.string().min(1),
  orgId: z.string().min(1),
  orgName: z.string().optional(),
  roles: z.array(z.string()),
});

/** Server-side only: the tokens never reach browser JavaScript. */
export const WebSession = z.object({
  user: SessionUser,
  accessToken: z.string().min(1),
  /** Epoch seconds. */
  accessTokenExpiresAt: z.number().int(),
  refreshToken: z.string().optional(),
  idToken: z.string().optional(),
});

export const AuthTransaction = z.object({
  codeVerifier: z.string().min(1),
  state: z.string().min(1),
  nonce: z.string().min(1),
  returnTo: z.string().min(1),
});

export type SessionUser = z.infer<typeof SessionUser>;
export type WebSession = z.infer<typeof WebSession>;
export type AuthTransaction = z.infer<typeof AuthTransaction>;

const cookieOptions = (env: OidcSettings, maxAge: number) => ({
  httpOnly: true,
  secure: isSecureOrigin(env),
  sameSite: 'lax' as const,
  path: '/',
  maxAge,
});

const chunkNames = (base: string): string[] =>
  Array.from({ length: AUTH_LIMITS.cookieChunksMax }, (_, i) => `${base}.${i}`);

export const readSession = async (
  request: NextRequest,
  env: OidcSettings,
): Promise<WebSession | null> => {
  const base = cookieName(env, AUTH_COOKIES.session);
  const sealed = chunkNames(base)
    .map((name) => request.cookies.get(name)?.value ?? '')
    .join('');
  if (sealed === '') return null;
  const payload = await unseal(sealed, env.WEB_SESSION_SECRET);
  const parsed = WebSession.safeParse(payload);
  return parsed.success ? parsed.data : null;
};

export const writeSession = async (
  response: NextResponse,
  env: OidcSettings,
  session: WebSession,
): Promise<void> => {
  const maxAge = env.WEB_SESSION_MAX_AGE_SECONDS;
  const sealed = await seal(session, env.WEB_SESSION_SECRET, maxAge);
  const parts = chunk(sealed, AUTH_LIMITS.cookieChunkBytes);
  if (parts.length > AUTH_LIMITS.cookieChunksMax)
    throw new Error('Session does not fit in the cookie budget');
  const names = chunkNames(cookieName(env, AUTH_COOKIES.session));
  names.forEach((name, i) => {
    const part = parts[i];
    response.cookies.set(
      name,
      part ?? '',
      cookieOptions(env, part === undefined ? 0 : maxAge),
    );
  });
};

export const clearSession = (response: NextResponse, env: OidcSettings) => {
  for (const name of chunkNames(cookieName(env, AUTH_COOKIES.session)))
    response.cookies.set(name, '', cookieOptions(env, 0));
};

export const writeTransaction = async (
  response: NextResponse,
  env: OidcSettings,
  transaction: AuthTransaction,
): Promise<void> => {
  const maxAge = AUTH_LIMITS.transactionMaxAgeSeconds;
  response.cookies.set(
    cookieName(env, AUTH_COOKIES.transaction),
    await seal(transaction, env.WEB_SESSION_SECRET, maxAge),
    cookieOptions(env, maxAge),
  );
};

export const readTransaction = async (
  request: NextRequest,
  env: OidcSettings,
): Promise<AuthTransaction | null> => {
  const sealed = request.cookies.get(
    cookieName(env, AUTH_COOKIES.transaction),
  )?.value;
  if (!sealed) return null;
  const parsed = AuthTransaction.safeParse(
    await unseal(sealed, env.WEB_SESSION_SECRET),
  );
  return parsed.success ? parsed.data : null;
};

/** The transaction is single-use: cleared on every callback outcome. */
export const clearTransaction = (response: NextResponse, env: OidcSettings) =>
  response.cookies.set(
    cookieName(env, AUTH_COOKIES.transaction),
    '',
    cookieOptions(env, 0),
  );

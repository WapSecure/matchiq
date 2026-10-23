import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { AUTH_LIMITS, BFF, BFF_HEADERS } from '@/constants/auth';
import { oidcSettings, type OidcSettings } from '@/lib/auth/server/env';
import { liveSession, settle } from '@/lib/auth/server/live-session';
import { isSameOrigin } from '@/lib/auth/server/redirects';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ path: string[] }> };

const { status: STATUS, titles: TITLES } = BFF;
const DOT_SEGMENTS = new Set<string>(BFF.dotSegments);

const problem = (status: number, title: string) =>
  NextResponse.json(
    { type: BFF.problemType(status), title, status },
    { status, headers: { [BFF.contentType]: BFF.problemMediaType } },
  );

const upstreamUrl = (env: OidcSettings, path: string[], search: string) =>
  `${env.API_INTERNAL_BASE_URL}/${path.map(encodeURIComponent).join('/')}${search}`;

const pick = (from: Headers, names: readonly string[]): Headers => {
  const out = new Headers();
  for (const name of names) {
    const value = from.get(name);
    if (value !== null) out.set(name, value);
  }
  return out;
};

/**
 * Backend-for-frontend: forwards a signed-in user's API calls with the
 * session's bearer token, so the token never reaches browser JavaScript.
 * Writes must come from this origin (CSRF); dot segments are refused.
 */
const forward = async (request: NextRequest, context: Context) => {
  const env = oidcSettings();
  if (env === null) return problem(STATUS.notFound, TITLES.unconfigured);
  const { path } = await context.params;
  if (path.some((segment) => DOT_SEGMENTS.has(segment)))
    return problem(STATUS.notFound, TITLES.notFound);
  if (request.method !== 'GET' && !isSameOrigin(request, env))
    return problem(STATUS.forbidden, TITLES.crossOrigin);
  const live = await liveSession(request, env);
  if (live.kind === 'unavailable')
    return problem(STATUS.unavailable, TITLES.idpUnreachable);
  if (live.kind !== 'active')
    return settle(problem(STATUS.unauthorized, TITLES.signInAgain), env, live);
  const headers = pick(request.headers, BFF_HEADERS.request);
  headers.set(BFF.authorization, `${BFF.bearer}${live.session.accessToken}`);
  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl(env, path, request.nextUrl.search), {
      method: request.method,
      headers,
      body: request.method === 'GET' ? undefined : await request.text(),
      signal: AbortSignal.any([
        request.signal,
        AbortSignal.timeout(AUTH_LIMITS.bffTimeoutMs),
      ]),
      cache: 'no-store',
    });
  } catch {
    // Still persist a refreshed session: its old refresh token is now spent.
    return settle(problem(STATUS.badGateway, TITLES.unreachable), env, live);
  }
  const response = new NextResponse(upstream.body, {
    status: upstream.status,
    headers: pick(upstream.headers, BFF_HEADERS.response),
  });
  return settle(response, env, live);
};

export const GET = forward;
export const POST = forward;
export const PUT = forward;

import type { Metadata } from 'next';
import { SiteFooter, SiteHeader, SyntheticNotice } from '@/components/layout';
import { AUTH_COPY, AUTH_QUERY, AUTH_ROUTES } from '@/constants/auth';
import { MAIN_CONTENT_ID } from '@/constants/site';
import { SignInContent } from '@/features/auth/sign-in-content';
import { oidcSettings } from '@/lib/auth/server/env';
import { safeReturnTo } from '@/lib/auth/server/redirects';
import { PUBLIC_ENV } from '@/lib/env';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: AUTH_COPY.signIn };

type PageProps = { searchParams: Promise<Record<string, string | undefined>> };

export default async function SignInPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const sso = oidcSettings() !== null;
  const returnTo = safeReturnTo(query[AUTH_QUERY.returnTo] ?? null);
  const errorCode = query[AUTH_QUERY.error];
  const ssoHref = `${AUTH_ROUTES.signIn}?${new URLSearchParams({ [AUTH_QUERY.returnTo]: returnTo }).toString()}`;
  return (
    <>
      <SyntheticNotice />
      <SiteHeader />
      <main id={MAIN_CONTENT_ID} className="min-h-[60dvh]">
        <SignInContent
          sso={sso}
          ssoHref={ssoHref}
          returnTo={returnTo}
          {...(errorCode === undefined ? {} : { errorCode })}
          showDemoAccounts={PUBLIC_ENV.NEXT_PUBLIC_DEMO_MODE}
        />
      </main>
      <SiteFooter />
    </>
  );
}

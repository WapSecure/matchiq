import type { Metadata } from 'next';
import { AlertIcon, LogoMark } from '@/components/icons';
import {
  BackLink,
  SiteFooter,
  SiteHeader,
  SyntheticNotice,
} from '@/components/layout';
import { ButtonLink, Container } from '@/components/ui';
import {
  AUTH_COPY,
  AUTH_ERRORS,
  AUTH_QUERY,
  AUTH_ROUTES,
} from '@/constants/auth';
import { ROUTES } from '@/constants/navigation';
import { MAIN_CONTENT_ID } from '@/constants/site';
import { DemoAccounts } from '@/features/auth/demo-accounts';
import { oidcSettings } from '@/lib/auth/server/env';
import { safeReturnTo } from '@/lib/auth/server/redirects';
import { PUBLIC_ENV } from '@/lib/env';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: AUTH_COPY.signIn };

type PageProps = { searchParams: Promise<Record<string, string | undefined>> };

const ERROR_COPY: Record<string, string> = {
  [AUTH_ERRORS.callback]: AUTH_COPY.errors.callback,
  [AUTH_ERRORS.unavailable]: AUTH_COPY.errors.unavailable,
  [AUTH_ERRORS.expired]: AUTH_COPY.errors.expired,
};

export default async function SignInPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const sso = oidcSettings() !== null;
  const returnTo = safeReturnTo(query[AUTH_QUERY.returnTo] ?? null);
  const error = ERROR_COPY[query[AUTH_QUERY.error] ?? ''];
  const ssoHref = `${AUTH_ROUTES.signIn}?${new URLSearchParams({ [AUTH_QUERY.returnTo]: returnTo }).toString()}`;
  return (
    <>
      <SyntheticNotice />
      <SiteHeader />
      <main id={MAIN_CONTENT_ID} className="min-h-[60dvh]">
        <Container className="max-w-xl py-6 sm:py-10">
          <BackLink />
          <div className="mt-4 rounded-lg border border-line bg-surface p-6 shadow-float sm:p-8">
            <span className="flex size-9 items-center justify-center rounded-md bg-accent text-accent-ink shadow-panel">
              <LogoMark size={20} />
            </span>
            <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink">
              {AUTH_COPY.signInTitle}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              {sso ? AUTH_COPY.signInLead : AUTH_COPY.ssoUnavailable}
            </p>
            {error ? (
              <p
                role="alert"
                className="mt-4 flex items-center gap-2 rounded-md border border-critical/30 bg-critical/5 px-3 py-2 text-sm text-ink"
              >
                <AlertIcon size={16} className="shrink-0 text-critical" />
                {error}
              </p>
            ) : null}
            <div className="mt-6 flex flex-col gap-2">
              {sso ? (
                <ButtonLink href={ssoHref} className="w-full">
                  {AUTH_COPY.continueSso}
                </ButtonLink>
              ) : null}
              <ButtonLink
                href={ROUTES.fixtures}
                variant={sso ? 'ghost' : 'primary'}
                className="w-full"
              >
                {AUTH_COPY.browseAnonymously}
              </ButtonLink>
            </div>
          </div>
          {sso && PUBLIC_ENV.NEXT_PUBLIC_DEMO_MODE ? (
            <div className="mt-6">
              <DemoAccounts returnTo={returnTo} />
            </div>
          ) : null}
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}

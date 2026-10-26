'use client';

import { AlertIcon, LogoMark } from '@/components/icons';
import { BackLink } from '@/components/layout';
import { ButtonLink, Container } from '@/components/ui';
import { AUTH_ERRORS } from '@/constants/auth';
import { ROUTES } from '@/constants/navigation';
import { usePageMessages } from '@/features/interface-language/use-page-messages';
import { DemoAccounts } from './demo-accounts';

type SignInContentProps = {
  sso: boolean;
  ssoHref: string;
  returnTo: string;
  errorCode?: string;
  showDemoAccounts: boolean;
};

export function SignInContent({
  sso,
  ssoHref,
  returnTo,
  errorCode,
  showDemoAccounts,
}: SignInContentProps) {
  const copy = usePageMessages().auth;
  const error =
    errorCode === AUTH_ERRORS.callback ||
    errorCode === AUTH_ERRORS.unavailable ||
    errorCode === AUTH_ERRORS.expired
      ? copy.errors[errorCode]
      : undefined;
  return (
    <Container className="max-w-xl py-6 sm:py-10">
      <BackLink />
      <div className="mt-4 rounded-lg border border-line bg-surface p-6 shadow-float sm:p-8">
        <span className="flex size-9 items-center justify-center rounded-md bg-accent text-accent-ink shadow-panel">
          <LogoMark size={20} />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink">
          {copy.title}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          {sso ? copy.lead : copy.unavailable}
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
              {copy.continue}
            </ButtonLink>
          ) : null}
          <ButtonLink
            href={ROUTES.fixtures}
            variant={sso ? 'ghost' : 'primary'}
            className="w-full"
          >
            {copy.publicDemo}
          </ButtonLink>
        </div>
      </div>
      {sso && showDemoAccounts ? (
        <div className="mt-6">
          <DemoAccounts returnTo={returnTo} />
        </div>
      ) : null}
    </Container>
  );
}

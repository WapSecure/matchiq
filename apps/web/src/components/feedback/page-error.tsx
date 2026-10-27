'use client';

import { AlertIcon, RefreshIcon } from '@/components/icons';
import { SyntheticNotice } from '@/components/layout/synthetic-notice';
import { Button, ButtonLink, Container } from '@/components/ui';
import { ROUTES } from '@/constants/navigation';
import { MAIN_CONTENT_ID } from '@/constants/site';
import { useInterfaceMessages } from '@/features/interface-language/interface-language-store';
import { SupportReference } from './support-reference';

type PageErrorProps = {
  /** Next's server-side error digest; a support reference, never the message. */
  digest?: string;
  onRetry: () => void;
};

/** Whole-page failure: friendly, with a retry and a way back to the matches. */
export function PageError({ digest, onRetry }: PageErrorProps) {
  const copy = useInterfaceMessages().feedback.page;
  return (
    <>
      <SyntheticNotice />
      <main
        id={MAIN_CONTENT_ID}
        data-testid="page-error"
        className="min-h-[60dvh]"
      >
        <Container className="py-16 sm:py-24">
          <div role="alert" className="mx-auto max-w-xl text-center">
            <span className="mx-auto flex size-10 items-center justify-center rounded-md bg-critical/10 text-critical">
              <AlertIcon size={20} />
            </span>
            <p className="eyebrow mt-4 text-accent">{copy.eyebrow}</p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              {copy.title}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-ink-muted sm:text-base">
              {copy.description}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button
                variant="primary"
                size="md"
                onClick={onRetry}
                leadingIcon={<RefreshIcon size={16} />}
              >
                {copy.retry}
              </Button>
              <ButtonLink href={ROUTES.fixtures} variant="secondary">
                {copy.lobby}
              </ButtonLink>
            </div>
            {digest ? (
              <div className="mt-6 flex justify-center">
                <SupportReference reference={digest} />
              </div>
            ) : null}
          </div>
        </Container>
      </main>
    </>
  );
}

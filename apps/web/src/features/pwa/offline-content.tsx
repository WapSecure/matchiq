'use client';

import { RefreshIcon } from '@/components/icons';
import { ButtonLink, Container } from '@/components/ui';
import { usePageMessages } from '@/features/interface-language/use-page-messages';

export function OfflineContent() {
  const copy = usePageMessages().offline;
  return (
    <Container className="py-16 sm:py-24">
      <div className="mx-auto max-w-xl text-center">
        <p className="eyebrow text-accent">{copy.eyebrow}</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          {copy.title}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted sm:text-base">
          {copy.description}
        </p>
        <ButtonLink
          href=""
          variant="secondary"
          size="md"
          className="mt-8"
          leadingIcon={<RefreshIcon size={16} />}
        >
          {copy.retry}
        </ButtonLink>
      </div>
    </Container>
  );
}

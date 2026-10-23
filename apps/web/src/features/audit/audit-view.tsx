'use client';

import type { Fixture } from '@matchiq/contracts';
import { useMemo, useState } from 'react';
import { EmptyState, ErrorState } from '@/components/feedback';
import { AuditIcon } from '@/components/icons';
import { Skeleton } from '@/components/ui';
import { LoadMore } from '@/components/ui/pagination';
import { AUDIT_COPY } from '@/constants/audit';
import { PAGINATION_NOUNS } from '@/constants/pagination';
import { MAIN_CONTENT_ID } from '@/constants/site';
import { AuditFilterBar } from './audit-filter-bar';
import {
  type AuditFilterForm,
  EMPTY_AUDIT_FILTERS,
  toAuditQuery,
} from './audit-query';
import { AuditTable } from './audit-table';
import { useAuditEvents } from './use-audit-events';

const copy = AUDIT_COPY;

function AuditResults({
  form,
  fixtureId,
}: {
  form: AuditFilterForm;
  fixtureId: string;
}) {
  const filters = useMemo(
    () => toAuditQuery(form, fixtureId),
    [form, fixtureId],
  );
  const audit = useAuditEvents(filters, true);
  const events = useMemo(
    () => audit.data?.pages.flatMap((p) => p.items) ?? [],
    [audit.data],
  );
  const nowMs = audit.dataUpdatedAt || Date.now();
  if (audit.isPending) {
    return (
      <div
        role="status"
        aria-label={copy.loading}
        className="flex flex-col gap-2"
      >
        <Skeleton className="h-10" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (audit.isError && events.length === 0) {
    return (
      <ErrorState
        title={copy.error}
        error={audit.error}
        onRetry={() => void audit.refetch()}
      />
    );
  }
  if (events.length === 0)
    return <EmptyState Icon={AuditIcon} title={copy.empty} />;
  return (
    <div className="flex flex-col gap-3">
      <AuditTable events={events} hasMore={audit.hasNextPage} nowMs={nowMs} />
      <LoadMore
        shown={events.length}
        hasMore={audit.hasNextPage}
        isLoading={audit.isFetchingNextPage}
        onLoadMore={() => void audit.fetchNextPage()}
        noun={PAGINATION_NOUNS.activity}
        label={copy.moreLabel}
        endMessage={copy.end}
      />
      {audit.isFetchNextPageError ? (
        <ErrorState
          title={copy.error}
          error={audit.error}
          onRetry={() => void audit.fetchNextPage()}
        />
      ) : null}
    </div>
  );
}

/** Gated on `audit:read` by `AuditScreen`; the API enforces it too. */
export function AuditView({ fixture }: { fixture: Fixture }) {
  const [form, setForm] = useState<AuditFilterForm>(EMPTY_AUDIT_FILTERS);
  return (
    <main
      id={MAIN_CONTENT_ID}
      className="mx-auto flex max-w-[1920px] flex-col gap-4 px-4 py-6 lg:px-6"
    >
      <header className="max-w-3xl">
        <p className="eyebrow text-accent">{copy.eyebrow}</p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-ink">
          {copy.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          {copy.description}
        </p>
      </header>
      <AuditFilterBar applied={form} onApply={setForm} />
      <AuditResults form={form} fixtureId={fixture.fixtureId} />
    </main>
  );
}

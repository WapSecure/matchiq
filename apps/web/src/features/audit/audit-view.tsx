'use client';

import type { Fixture } from '@matchiq/contracts';
import { useMemo, useState } from 'react';
import { EmptyState, ErrorState } from '@/components/feedback';
import { AuditIcon } from '@/components/icons';
import { Button, Skeleton } from '@/components/ui';
import { AUDIT_COPY } from '@/constants/audit';
import { MAIN_CONTENT_ID } from '@/constants/site';
import { AuditFilterBar } from './audit-filter-bar';
import {
  type AuditFilterForm,
  EMPTY_AUDIT_FILTERS,
  toAuditQuery,
} from './audit-query';
import { AuditTable } from './audit-table';
import { useAuditEvents } from './use-audit-events';
import { useMatchWindow } from './use-match-window';

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
      <div className="flex items-center justify-center gap-3 text-xs text-ink-subtle">
        {audit.hasNextPage ? (
          <Button
            onClick={() => {
              if (!audit.isFetchingNextPage) void audit.fetchNextPage();
            }}
            aria-disabled={audit.isFetchingNextPage || undefined}
          >
            {audit.isFetchingNextPage ? copy.loadingMore : copy.loadMore}
          </Button>
        ) : (
          <p>{copy.end}</p>
        )}
      </div>
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
  const matchWindow = useMatchWindow(fixture.fixtureId);
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
      <AuditFilterBar
        applied={form}
        onApply={setForm}
        matchWindow={matchWindow}
      />
      <AuditResults form={form} fixtureId={fixture.fixtureId} />
    </main>
  );
}

'use client';

import { type FormEvent, useState } from 'react';
import {
  Button,
  Combobox,
  DateRangePicker,
  Select,
  TextField,
} from '@/components/ui';
import { AUDIT_COPY } from '@/constants/audit';
import {
  AUDIT_DATE_PRESETS,
  AUDIT_FILTER_COPY,
} from '@/constants/audit-filters';
import { useStudioUi } from '@/features/studio/store';
import type { InstantRange } from '@/lib/date-time';
import {
  ACTION_SECTIONS,
  ACTOR_OPTIONS,
  fromKey,
  SCOPE_OPTIONS,
  TARGET_OPTIONS,
  toKey,
} from './audit-filter-options';
import {
  type AuditFilterForm,
  type AuditScope,
  EMPTY_AUDIT_FILTERS,
} from './audit-query';

type AuditFilterBarProps = {
  applied: AuditFilterForm;
  onApply: (form: AuditFilterForm) => void;
  /** The session's lifetime, for the "This match" preset. */
  matchWindow?: InstantRange | null;
};

const fields = AUDIT_COPY.fields;

type Draft = {
  draft: AuditFilterForm;
  set: <K extends keyof AuditFilterForm>(
    key: K,
    value: AuditFilterForm[K],
  ) => void;
};

function WhoAndWhat({ draft, set }: Draft) {
  return (
    <>
      <Select
        label={fields.scope}
        value={draft.scope}
        options={SCOPE_OPTIONS}
        onChange={(v) => set('scope', v as AuditScope)}
      />
      <Combobox
        label={fields.action}
        value={toKey(draft.action)}
        sections={ACTION_SECTIONS}
        placeholder={AUDIT_FILTER_COPY.actionPlaceholder}
        onChange={(v) => set('action', fromKey(v))}
      />
      <Select
        label={fields.actorType}
        value={toKey(draft.actorType)}
        options={ACTOR_OPTIONS}
        onChange={(v) => set('actorType', fromKey(v))}
      />
      <Select
        label={fields.targetType}
        value={toKey(draft.targetType)}
        options={TARGET_OPTIONS}
        onChange={(v) => set('targetType', fromKey(v))}
      />
      <TextField
        label={fields.targetId}
        value={draft.targetId}
        onChange={(v) => set('targetId', v)}
        isDisabled={draft.targetType === ''}
        hint={draft.targetType === '' ? AUDIT_COPY.targetIdHint : undefined}
        spellCheck={false}
      />
    </>
  );
}

/** Edits a draft and applies it on submit, so typing never fires a request. */
export function AuditFilterBar({
  applied,
  onApply,
  matchWindow,
}: AuditFilterBarProps) {
  const [draft, setDraft] = useState(applied);
  const locale = useStudioUi((s) => s.locale);
  const set: Draft['set'] = (key, value) =>
    setDraft((d) => ({ ...d, [key]: value }));
  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    onApply(draft);
  };
  return (
    <form
      aria-label={AUDIT_COPY.filtersLabel}
      onSubmit={onSubmit}
      className="grid grid-cols-1 items-start gap-3 rounded-lg border border-line bg-surface p-4 shadow-panel sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-8"
    >
      <WhoAndWhat draft={draft} set={set} />
      <DateRangePicker
        label={AUDIT_FILTER_COPY.when}
        value={
          draft.from && draft.to ? { start: draft.from, end: draft.to } : null
        }
        onChange={(range) =>
          setDraft((d) => ({
            ...d,
            from: range?.start ?? '',
            to: range?.end ?? '',
          }))
        }
        presets={AUDIT_DATE_PRESETS}
        matchWindow={matchWindow}
        granularity="second"
        locale={locale}
        className="sm:col-span-2"
      />
      <div className="flex items-end gap-2 self-end pb-px">
        <Button type="submit" variant="primary">
          {AUDIT_COPY.apply}
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setDraft(EMPTY_AUDIT_FILTERS);
            onApply(EMPTY_AUDIT_FILTERS);
          }}
        >
          {AUDIT_COPY.reset}
        </Button>
      </div>
    </form>
  );
}

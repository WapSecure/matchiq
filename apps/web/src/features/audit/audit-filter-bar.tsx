'use client';

import { type FormEvent, useState } from 'react';
import { Button, SelectField, TextField } from '@/components/ui';
import { AUDIT_COPY, AUDIT_FILTER_OPTIONS } from '@/constants/audit';
import {
  type AuditFilterForm,
  type AuditScope,
  EMPTY_AUDIT_FILTERS,
} from './audit-query';

type AuditFilterBarProps = {
  applied: AuditFilterForm;
  onApply: (form: AuditFilterForm) => void;
};

const fields = AUDIT_COPY.fields;
const options = AUDIT_FILTER_OPTIONS;

/** Edits a draft and applies it on submit, so typing never fires a request. */
export function AuditFilterBar({ applied, onApply }: AuditFilterBarProps) {
  const [draft, setDraft] = useState(applied);
  const set =
    <K extends keyof AuditFilterForm>(key: K) =>
    (value: AuditFilterForm[K]) =>
      setDraft((d) => ({ ...d, [key]: value }));
  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    onApply(draft);
  };
  return (
    <form
      aria-label={AUDIT_COPY.filtersLabel}
      onSubmit={onSubmit}
      className="grid grid-cols-1 gap-3 rounded-lg border border-line bg-surface p-4 shadow-panel sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-8"
    >
      <SelectField
        label={fields.scope}
        value={draft.scope}
        options={options.scope}
        onChange={(v) => set('scope')(v as AuditScope)}
      />
      <SelectField
        label={fields.action}
        value={draft.action}
        options={options.action}
        onChange={set('action')}
      />
      <SelectField
        label={fields.actorType}
        value={draft.actorType}
        options={options.actorType}
        onChange={set('actorType')}
      />
      <SelectField
        label={fields.targetType}
        value={draft.targetType}
        options={options.targetType}
        onChange={set('targetType')}
      />
      <TextField
        label={fields.targetId}
        value={draft.targetId}
        onChange={set('targetId')}
        disabled={draft.targetType === ''}
        hint={draft.targetType === '' ? AUDIT_COPY.targetIdHint : undefined}
        spellCheck={false}
      />
      <TextField
        type="datetime-local"
        step={1}
        label={fields.from}
        value={draft.from}
        onChange={set('from')}
      />
      <TextField
        type="datetime-local"
        step={1}
        label={fields.to}
        value={draft.to}
        onChange={set('to')}
      />
      <div className="flex items-end gap-2">
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

'use client';

import { useState } from 'react';
import { useInterfaceMessages } from '@/features/interface-language/interface-language-store';

/** The request id, small and copyable, for quoting to support. */
export function SupportReference({ reference }: { reference: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useInterfaceMessages().feedback.support;
  const copyReference = () => {
    void navigator.clipboard
      ?.writeText(reference)
      .then(() => setCopied(true))
      .catch(() => setCopied(false));
  };
  return (
    <p
      data-testid="support-reference"
      className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-micro text-ink-subtle"
    >
      <span>{copy.instruction}</span>
      <span>
        {copy.reference}{' '}
        <span className="tabular select-all font-mono">{reference}</span>
      </span>
      <button
        type="button"
        onClick={copyReference}
        className="rounded-sm text-accent-strong underline-offset-2 hover:underline"
      >
        {copied ? copy.copied : copy.copy}
      </button>
    </p>
  );
}

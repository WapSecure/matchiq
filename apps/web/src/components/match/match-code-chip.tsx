'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckIcon, CopyIcon } from '@/components/icons';
import { Tooltip } from '@/components/ui';
import { COPIED_RESET_MS, MATCH_CODE_COPY } from '@/constants/match-code';
import { cn } from '@/lib/cn';

type MatchCodeChipProps = {
  code: string;
  /** Hides the "Match code" caption where the context already names it. */
  compact?: boolean;
  className?: string;
};

/** The match code with a copy button; "Copied" is announced politely. */
export function MatchCodeChip({
  code,
  compact = false,
  className,
}: MatchCodeChipProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = () => {
    void navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), COPIED_RESET_MS);
    });
  };

  return (
    <div className={cn('flex min-w-0 items-center gap-2', className)}>
      {compact ? null : (
        <span className="text-micro text-ink-subtle">
          {MATCH_CODE_COPY.label}
        </span>
      )}
      <Tooltip content={MATCH_CODE_COPY.hint}>
        <button
          type="button"
          onClick={copy}
          aria-label={`${MATCH_CODE_COPY.copy}: ${code}`}
          className="tabular inline-flex min-h-7 cursor-pointer items-center gap-1.5 rounded-md border border-line bg-surface-raised px-2 font-mono text-xs text-ink outline-none transition-colors hover:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent pointer-coarse:min-h-11"
        >
          <span className="truncate">{code}</span>
          {copied ? (
            <CheckIcon size={14} className="text-positive" />
          ) : (
            <CopyIcon size={14} className="text-ink-subtle" />
          )}
        </button>
      </Tooltip>
      <span role="status" className="text-micro text-positive">
        {copied ? MATCH_CODE_COPY.copied : ''}
      </span>
    </div>
  );
}

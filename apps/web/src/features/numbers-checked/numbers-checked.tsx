'use client';

import type { Insight, Narrative, Persona } from '@matchiq/contracts';
import { useMemo } from 'react';
import { CheckIcon } from '@/components/icons';
import { Button } from '@/components/ui';
import { NUMBERS_CHECKED_COPY as COPY } from '@/constants/numbers-checked';
import { cn } from '@/lib/cn';
import { type CheckedFigure, narrativeFigures } from './check-figures';

type NumbersCheckedProps = {
  figures: readonly CheckedFigure[] | null;
  persona: Persona;
  headline: string;
  onOpen?: () => void;
  className?: string;
};

/** Persona-sized receipt: a line and link for analysts, a reassurance for fans, a quiet tick on air. */
export function NumbersChecked({
  figures,
  persona,
  headline,
  onOpen,
  className,
}: NumbersCheckedProps) {
  if (!figures || figures.length === 0) return null;
  const line = COPY.line(figures.length);
  const tick = <CheckIcon size={12} className="shrink-0 text-positive" />;
  const base = 'inline-flex items-center gap-1 text-micro text-ink-subtle';
  if (persona === 'ANALYST' && onOpen) {
    return (
      <Button
        size="xs"
        variant="ghost"
        className={className}
        leadingIcon={tick}
        aria-label={`${line}. ${COPY.open(headline)}`}
        aria-haspopup="dialog"
        onClick={onOpen}
      >
        {line}
      </Button>
    );
  }
  return (
    <p className={cn(base, className)}>
      {tick}
      <span aria-hidden>
        {persona === 'CASUAL' ? COPY.casual : COPY.broadcast}
      </span>
      <span className="sr-only">{line}</span>
    </p>
  );
}

type MomentProps = {
  insight: Insight;
  narrative: Narrative | null;
  /** True when the moment was ruled out, suppressed or has no published wording. */
  withheld: boolean;
  persona: Persona;
  headline: string;
  onOpen: () => void;
  className?: string;
};

export function MomentNumbersChecked({
  insight,
  narrative,
  withheld,
  persona,
  headline,
  onOpen,
  className,
}: MomentProps) {
  const figures = useMemo(
    () =>
      narrative && !withheld ? narrativeFigures(insight, narrative) : null,
    [insight, narrative, withheld],
  );
  return (
    <NumbersChecked
      figures={figures}
      persona={persona}
      headline={headline}
      onOpen={onOpen}
      className={className}
    />
  );
}

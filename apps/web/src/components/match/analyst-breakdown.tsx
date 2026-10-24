'use client';

import type { AnalystBreakdown as Breakdown } from '@matchiq/contracts';
import { useId, useState } from 'react';
import { ChevronDownIcon } from '@/components/icons';
import { Button } from '@/components/ui';
import { BREAKDOWN_COPY, BREAKDOWN_PARTS } from '@/constants/match';
import { SITE } from '@/constants/site';
import { cn } from '@/lib/cn';

type HeadingLevel = 3 | 4 | 5;
type PartKey = (typeof BREAKDOWN_PARTS)[number];

type AnalystBreakdownProps = {
  breakdown: Breakdown;
  /** Language of the breakdown text; the labels stay in the site language. */
  language: string;
  level?: HeadingLevel;
  className?: string;
};

function Part({
  part,
  breakdown,
  language,
  level,
}: {
  part: PartKey;
  breakdown: Breakdown;
  language: string;
  level: HeadingLevel;
}) {
  const Heading = `h${level}` as const;
  return (
    <div className="flex flex-col gap-0.5">
      <Heading className="text-micro font-semibold uppercase tracking-wide text-ink-subtle">
        {BREAKDOWN_COPY.parts[part]}
      </Heading>
      <p lang={language} className="text-[13px] leading-relaxed text-ink-muted">
        {breakdown[part].text}
      </p>
    </div>
  );
}

/** Three labelled parts, opening on the first; the rest on request. */
export function AnalystBreakdown({
  breakdown,
  language,
  level = 3,
  className,
}: AnalystBreakdownProps) {
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();
  const [first, ...rest] = BREAKDOWN_PARTS;
  return (
    <section
      aria-label={BREAKDOWN_COPY.label}
      lang={SITE.locale}
      className={cn('flex flex-col gap-2', className)}
    >
      <Part
        part={first}
        breakdown={breakdown}
        language={language}
        level={level}
      />
      <div id={panelId} hidden={!expanded} className="flex flex-col gap-2">
        {rest.map((part) => (
          <Part
            key={part}
            part={part}
            breakdown={breakdown}
            language={language}
            level={level}
          />
        ))}
      </div>
      <Button
        size="xs"
        variant="ghost"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded((open) => !open)}
        leadingIcon={
          <ChevronDownIcon
            size={14}
            className={cn(
              'transition-transform duration-150 motion-reduce:transition-none',
              expanded && 'rotate-180',
            )}
          />
        }
        className="-ml-2 self-start"
      >
        {expanded ? BREAKDOWN_COPY.collapse : BREAKDOWN_COPY.expand}
      </Button>
    </section>
  );
}

import type { ReactNode } from 'react';

type SectionHeaderProps = {
  id: string;
  eyebrow: string;
  title: string;
  description?: ReactNode;
};

export function SectionHeader({
  id,
  eyebrow,
  title,
  description,
}: SectionHeaderProps) {
  return (
    <header className="max-w-2xl">
      <p className="eyebrow text-accent">{eyebrow}</p>
      <h2
        id={`${id}-title`}
        className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-3xl"
      >
        {title}
      </h2>
      {description ? (
        <p className="mt-3 text-base leading-relaxed text-ink-muted">
          {description}
        </p>
      ) : null}
    </header>
  );
}

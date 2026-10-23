import { CheckIcon, TrophyIcon } from '@/components/icons';
import { ButtonLink } from '@/components/ui';
import { ROUTES } from '@/constants/navigation';
import { RECAP_COPY } from '@/constants/recap';

const copy = RECAP_COPY.notReady;

/** Before full time: what the recap will hold, and a way back to the match. */
export function RecapNotReady({ fixtureId }: { fixtureId: string }) {
  return (
    <section
      aria-labelledby="recap-not-ready-title"
      className="relative overflow-hidden rounded-lg border border-line bg-surface px-5 py-10 shadow-panel sm:px-10 sm:py-14"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-accent-soft/70 to-transparent"
      />
      <div className="relative mx-auto flex max-w-md flex-col items-center text-center">
        <span className="flex size-14 items-center justify-center rounded-full border border-accent/30 bg-surface text-accent shadow-panel ring-8 ring-accent-soft/60">
          <TrophyIcon size={24} />
        </span>
        <p
          role="status"
          className="mt-5 inline-flex items-center gap-2 text-xs font-medium text-ink-muted"
        >
          <span
            aria-hidden
            className="size-1.5 rounded-full bg-accent motion-safe:animate-pulse"
          />
          {copy.waiting}
        </p>
        <h2
          id="recap-not-ready-title"
          className="mt-2 text-balance text-xl font-semibold tracking-tight text-ink"
        >
          {copy.title}
        </h2>
        <p className="mt-2 text-pretty text-sm leading-relaxed text-ink-muted">
          {copy.description}
        </p>
        <div className="mt-6 w-full rounded-md border border-line bg-surface-raised/60 px-4 py-3 text-left">
          <h3 className="eyebrow">{copy.expectTitle}</h3>
          <ul className="mt-2 flex flex-col gap-1.5 text-[13px] text-ink">
            {copy.expect.map((item) => (
              <li key={item} className="flex gap-2">
                <CheckIcon size={14} className="mt-0.5 shrink-0 text-accent" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <ButtonLink
          href={ROUTES.studio(fixtureId)}
          variant="secondary"
          className="mt-6"
        >
          {copy.back}
        </ButtonLink>
      </div>
    </section>
  );
}

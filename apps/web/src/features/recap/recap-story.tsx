'use client';

import type { Fixture } from '@matchiq/contracts';
import { RECAP_COPY } from '@/constants/recap';
import { SITE } from '@/constants/site';
import { useStudioUi } from '@/features/studio/store';
import type { RecapDocument } from '@/lib/api/session-schemas';
import { formatSharePair } from '@/lib/format';
import { pickNarrative } from './pick-narrative';
import { orderedMoments } from './recap-order';
import { recapTranslationNotice } from './recap-translation-notice';

const copy = RECAP_COPY;

/**
 * The latest of the most important moments, which usually decided the match,
 * in the chosen audience and language.
 */
const useLede = (recap: RecapDocument) => {
  const persona = useStudioUi((s) => s.persona);
  const locale = useStudioUi((s) => s.locale);
  const top = orderedMoments(recap.keyMoments)
    .reverse()
    .sort((a, b) => a.priority.localeCompare(b.priority))[0];
  return top ? pickNarrative(top.narratives, persona, locale) : null;
};

/** Result in words, the story in one line, and three quick facts. */
export function RecapStory({
  recap,
  fixture,
}: {
  recap: RecapDocument;
  fixture: Fixture;
}) {
  const s = recap.finalSnapshot;
  const lede = useLede(recap);
  const locale = useStudioUi((state) => state.locale);
  const notice = recapTranslationNotice(lede, locale);
  // The same whole-percent split as Final stats, so the two always add up to 100%.
  const possession = formatSharePair(
    s.home.possessionPct,
    s.away.possessionPct,
  );
  const facts = [
    copy.facts.moments(recap.keyMoments.length),
    copy.facts.possession(
      possession?.[0] ?? copy.facts.missing,
      possession?.[1] ?? copy.facts.missing,
    ),
    copy.facts.shots(s.home.shots, s.away.shots),
  ];
  return (
    <div className="mx-auto mt-6 flex max-w-2xl flex-col items-center gap-2 text-center">
      <h2 className="text-balance text-lg font-semibold tracking-tight text-ink sm:text-xl">
        {copy.result(
          fixture.home.name,
          fixture.away.name,
          s.score.home,
          s.score.away,
        )}
      </h2>
      {lede ? (
        <p
          lang={lede.language}
          className="text-pretty text-sm leading-relaxed text-ink-muted"
        >
          <span className="font-medium text-ink">
            {lede.narrative.headline}.
          </span>{' '}
          {lede.narrative.body}
        </p>
      ) : null}
      {notice ? (
        <p lang={SITE.locale} className="text-xs text-warning">
          {notice}
        </p>
      ) : null}
      <ul className="mt-1 flex flex-wrap justify-center gap-1.5">
        {facts.map((f) => (
          <li
            key={f}
            className="tabular rounded-full border border-line bg-surface-raised px-2.5 py-0.5 text-xs text-ink-muted"
          >
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}

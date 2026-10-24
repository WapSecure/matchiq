import type { RecapDocument } from '@matchiq/db';
import type { RecapQuery } from './intelligence.schemas';

/** With no filter the stored recap is returned as it is. */
export const filterRecap = (
  recap: RecapDocument,
  { persona, lang }: RecapQuery,
): RecapDocument => {
  if (persona === undefined && lang === undefined) return recap;
  const wanted = (v: { persona: string; locale: string }): boolean =>
    (persona === undefined || v.persona === persona) &&
    (lang === undefined || v.locale === lang);
  return {
    ...recap,
    keyMoments: recap.keyMoments.map((moment) => ({
      ...moment,
      narratives: moment.narratives.filter(wanted),
    })),
    ...(recap.story === undefined ? {} : { story: recap.story.filter(wanted) }),
  };
};

import type {
  Fixture,
  Insight,
  Locale,
  MatchSnapshot,
  MatchStory,
  Persona,
  StoryParagraph,
} from '@matchiq/contracts';
import { LOCALES, PERSONAS } from '../../constants';
import { STORY_EN } from './story-copy-en';
import { STORY_ES } from './story-copy-es';
import { STORY_FR } from './story-copy-fr';
import { STORY_PCM } from './story-copy-pcm';
import type { StoryCopy } from './story-copy-types';
import { storyFacts, type StoryMoment } from './story-facts';
import {
  atOf,
  finalGoals,
  goalSentence,
  minuteCite,
  num,
  paragraph,
  redSentence,
  snapshotCite,
  swingSentence,
  type Sentence,
  type Writer,
} from './story-paragraphs';
import { SNAPSHOT_REFS } from './story-facts';

const COPY: Readonly<Record<Locale, StoryCopy>> = {
  'en-GB': STORY_EN,
  'fr-FR': STORY_FR,
  'es-ES': STORY_ES,
  'pcm-NG': STORY_PCM,
};

const MAX_SWINGS_PER_HALF = 2;
const MAX_RED_TURNS = 2;

const byTime = (a: Sentence, b: Sentence): number => {
  const [x, y] = [a.moments[0]?.insight, b.moments[0]?.insight];
  return (
    (x?.period ?? 0) - (y?.period ?? 0) ||
    (x?.matchClockMs ?? 0) - (y?.matchClockMs ?? 0)
  );
};

const halfSentences = (w: Writer, first: boolean): Sentence[] => {
  const inHalf = (m: StoryMoment) => (first ? m.period === 1 : m.period > 1);
  const { goals, reds, swings } = w.facts;
  return [
    ...goals.filter(inHalf).map((m) => goalSentence(w, m)),
    ...reds.filter(inHalf).map((m) => redSentence(w, m)),
    ...swings
      .filter(inHalf)
      .slice(0, MAX_SWINGS_PER_HALF)
      .map((m) => swingSentence(w, m)),
  ].sort(byTime);
};

const firstHalf = (w: Writer): StoryParagraph | null => {
  const events = halfSentences(w, true);
  const last = w.facts.goals.filter((m) => m.period === 1).at(-1);
  const close: Sentence =
    last?.score === undefined
      ? { text: w.copy.goallessFirst, cited: [], moments: [] }
      : {
          text: w.copy.halfTime({
            home: w.facts.home,
            away: w.facts.away,
            h: num(w, last.score.home),
            a: num(w, last.score.away),
          }),
          cited: [last.score.home, last.score.away],
          moments: [last],
        };
  if (last !== undefined && last.score === undefined)
    return paragraph('FIRST_HALF', events);
  return paragraph('FIRST_HALF', [...events, close]);
};

const secondHalf = (w: Writer): StoryParagraph | null => {
  const events = halfSentences(w, false);
  const scored = w.facts.goals.some((m) => m.period > 1);
  const lead = events.length === 0 ? w.copy.quietSecond : w.copy.goallessSecond;
  const quiet: Sentence[] = scored
    ? []
    : [{ text: lead, cited: [], moments: [] }];
  return paragraph('SECOND_HALF', [...quiet, ...events]);
};

/** The goal that put the winner ahead for good, or the last goal of a draw. */
const turningGoal = (w: Writer): Sentence => {
  const home = finalGoals(w, 'home').value;
  const away = finalGoals(w, 'away').value;
  const { goals } = w.facts;
  const fan = w.copy.fan;
  const casual = w.fan === true;
  if (home === away) {
    const last = goals.at(-1);
    if (last === undefined)
      return {
        text: casual ? fan.noGoals : w.copy.noGoals,
        cited: [],
        moments: [],
      };
    const say = casual ? fan.equaliser : w.copy.equaliser;
    return {
      text: say(last.player, last.team, atOf(w, last)),
      cited: minuteCite(last),
      moments: [last],
    };
  }
  const winner = home > away ? 'home' : 'away';
  const needed = Math.min(home, away) + 1;
  const decisive = goals.filter((m) => m.side === winner)[needed - 1];
  if (decisive === undefined)
    return { text: w.copy.noGoals, cited: [], moments: [] };
  const say = casual ? fan.decisive : w.copy.decisive;
  return {
    text: say(decisive.player, decisive.team, atOf(w, decisive)),
    cited: minuteCite(decisive),
    moments: [decisive],
  };
};

const turningPoints = (w: Writer): StoryParagraph | null =>
  paragraph('TURNING_POINTS', [
    turningGoal(w),
    ...w.facts.reds.slice(0, MAX_RED_TURNS).map((m) => ({
      text: w.copy.redTurn(m.team, atOf(w, m)),
      cited: minuteCite(m),
      moments: [m],
    })),
  ]);

const fullTime = (w: Writer, withShots: boolean): StoryParagraph | null => {
  const [h, a] = [finalGoals(w, 'home'), finalGoals(w, 'away')];
  const { home, away } = w.facts;
  const casual = w.fan === true;
  const say = casual ? w.copy.fan : w.copy;
  const result =
    h.value === a.value
      ? say.draw({ home, away, h: num(w, h), a: num(w, a) })
      : h.value > a.value
        ? say.win(home, away, num(w, h), num(w, a))
        : say.win(away, home, num(w, a), num(w, h));
  const sentences: Sentence[] = [{ text: result, cited: [h, a], moments: [] }];
  if (withShots) {
    const cites = (['home', 'away'] as const).flatMap((side) => [
      snapshotCite(w, SNAPSHOT_REFS.shots(side)),
      snapshotCite(w, SNAPSHOT_REFS.onTarget(side)),
    ]);
    const [hs, ht, as, at] = cites.map((c) => num(w, c)) as [
      string,
      string,
      string,
      string,
    ];
    sentences.push({
      text: w.copy.shots(home, [hs, ht], away, [as, at]),
      cited: cites,
      moments: [],
    });
  }
  return paragraph('FULL_TIME', sentences);
};

const PLAN: Readonly<
  Record<Persona, (w: Writer) => (StoryParagraph | null)[]>
> = {
  ANALYST: (w) => [
    firstHalf(w),
    secondHalf(w),
    turningPoints(w),
    fullTime(w, true),
  ],
  CASUAL: (w) => {
    const fan = { ...w, fan: true };
    return [turningPoints(fan), fullTime(fan, false)];
  },
  BROADCAST: (w) => [turningPoints(w), fullTime(w, true)],
};

export interface StoryInput {
  readonly fixture: Fixture;
  readonly snapshot: MatchSnapshot;
  readonly insights: readonly { insight: Insight; period: number }[];
}

/**
 * The deterministic full-time match story for every persona and locale
 * (MQ-068), from the final snapshot and the moments' engine context. Analyst
 * is the longest; Fan is short and lively; Broadcast is concise.
 */
export const buildStories = (input: StoryInput): MatchStory[] => {
  const facts = storyFacts(input.fixture, input.snapshot, input.insights);
  return PERSONAS.flatMap((persona) =>
    LOCALES.map((locale) => ({
      persona,
      locale,
      paragraphs: PLAN[persona]({ copy: COPY[locale], locale, facts }).filter(
        (p): p is StoryParagraph => p !== null,
      ),
    })),
  );
};

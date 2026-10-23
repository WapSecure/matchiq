import { MatchStory, RecapDocument } from '@matchiq/contracts';
import { GOLDEN_SCENARIOS, goldenPipelineRun } from '../../../test/golden';
import { LOCALES, PERSONAS } from '../../constants';
import { buildRecap } from '../recap-builder';
import { buildStories } from './match-story';
import { paragraphIssues } from './story-verify';

const lengthOf = (story: MatchStory) =>
  story.paragraphs.reduce((n, p) => n + p.text.length, 0);

describe('match story', () => {
  it.each(GOLDEN_SCENARIOS)(
    '%s: every paragraph cites numbers the engine computed',
    async (name) => {
      const run = await goldenPipelineRun(name);
      const stories = buildStories(run);
      expect(stories).toHaveLength(PERSONAS.length * LOCALES.length);
      const sources = {
        snapshot: run.snapshot,
        insights: run.insights.map((i) => i.insight),
      };
      for (const story of stories) {
        expect(MatchStory.safeParse(story).success).toBe(true);
        for (const paragraph of story.paragraphs) {
          expect(paragraphIssues(paragraph, story.locale, sources)).toEqual([]);
        }
      }
    },
  );

  it('is longest for the Analyst and covers both halves and the turning points', async () => {
    const run = await goldenPipelineRun('comeback');
    const stories = buildStories(run).filter((s) => s.locale === 'en-GB');
    const by = (persona: string) => stories.find((s) => s.persona === persona);
    const analyst = by('ANALYST');
    const fan = by('CASUAL');
    const broadcast = by('BROADCAST');
    if (!analyst || !fan || !broadcast) throw new Error('missing story');
    expect(analyst.paragraphs.map((p) => p.kind)).toEqual([
      'FIRST_HALF',
      'SECOND_HALF',
      'TURNING_POINTS',
      'FULL_TIME',
    ]);
    expect(lengthOf(analyst)).toBeGreaterThan(lengthOf(broadcast));
    expect(lengthOf(analyst)).toBeGreaterThan(lengthOf(fan));
    const final = analyst.paragraphs.at(-1);
    const { home, away } = run.snapshot.score;
    expect(final?.text).toContain(
      `${Math.max(home, away)}–${Math.min(home, away)}`,
    );
  });

  it('catches a story number that does not match the snapshot', async () => {
    const run = await goldenPipelineRun('comeback');
    const [story] = buildStories(run).filter((s) => s.persona === 'ANALYST');
    const final = story?.paragraphs.at(-1);
    if (story === undefined || final === undefined) throw new Error('no story');
    const tampered = {
      ...final,
      citedValues: final.citedValues.map((c) => ({ ...c, value: c.value + 1 })),
    };
    const sources = {
      snapshot: run.snapshot,
      insights: run.insights.map((i) => i.insight),
    };
    expect(
      paragraphIssues(tampered, story.locale, sources).length,
    ).toBeGreaterThan(0);
  });

  it('is part of the recap, with Analyst breakdowns on the moments', async () => {
    const run = await goldenPipelineRun('red-card-swing');
    const recap = RecapDocument.parse(
      buildRecap({
        fixtureId: run.fixture.fixtureId,
        title: run.fixture.title,
        snapshot: run.snapshot,
        insights: run.insights,
        narratives: run.narratives,
        fixture: run.fixture,
      }),
    );
    expect(recap.story?.length).toBe(PERSONAS.length * LOCALES.length);
    const narratives = recap.keyMoments.flatMap((m) => m.narratives);
    expect(narratives.some((n) => n.breakdown !== undefined)).toBe(true);
    expect(
      narratives.every(
        (n) => (n.breakdown === undefined) === (n.persona !== 'ANALYST'),
      ),
    ).toBe(true);
  });
});

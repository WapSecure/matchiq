import { join } from 'node:path';
import type {
  Fixture,
  Insight,
  MatchEvent,
  MatchSnapshot,
  Narrative,
} from '@matchiq/contracts';
import {
  findFixturesFolder,
  loadTemplateFile,
  type ParsedFixtureFile,
} from '@matchiq/db';
import {
  detectKeyMoments,
  project,
  toSnapshot,
} from '@matchiq/football-engine';
import { MatchPipeline } from '../app/pipeline/match-pipeline';
import { emptyBatch } from '../app/pipeline/pipeline-batch';

export const GOLDEN_SCENARIOS = [
  'comeback',
  'high-press',
  'low-event',
  'possession-dominance',
  'red-card-swing',
] as const;

const cache = new Map<string, Promise<ParsedFixtureFile>>();

/** Loads and validates a golden fixture file once per test process. */
export const loadGolden = (name: string): Promise<ParsedFixtureFile> => {
  let file = cache.get(name);
  if (file === undefined) {
    file = loadTemplateFile(join(findFixturesFolder(), `${name}.json`));
    cache.set(name, file);
  }
  return file;
};

export interface GoldenMoments {
  readonly fixture: Fixture;
  readonly events: readonly MatchEvent[];
  readonly insights: Insight[];
}

export const goldenMoments = async (name: string): Promise<GoldenMoments> => {
  const { fixture, events } = await loadGolden(name);
  const insights = detectKeyMoments(project(fixture, events));
  return { fixture, events, insights };
};

export interface GoldenPipelineRun {
  readonly fixture: Fixture;
  readonly snapshot: MatchSnapshot;
  readonly insights: { insight: Insight; period: number }[];
  readonly narratives: Narrative[];
}

/** Runs the worker pipeline (templates only) over a golden match, as a live session would. */
export const goldenPipelineRun = async (
  name: string,
): Promise<GoldenPipelineRun> => {
  const { fixture, events } = await loadGolden(name);
  const pipeline = new MatchPipeline({
    fixture,
    aiEnabled: false,
    now: () => '2026-10-24T15:00:00.000Z',
  });
  const batch = emptyBatch();
  for (const event of events) pipeline.step(event, batch);
  return {
    fixture,
    snapshot: toSnapshot(project(fixture, events)),
    insights: batch.insights.map((r) => ({
      insight: r.insight,
      period: r.period,
    })),
    narratives: batch.narratives,
  };
};

export const firstOfKind = (
  insights: readonly Insight[],
  kind: Insight['kind'],
): Insight => {
  const insight = insights.find((i) => i.kind === kind);
  if (insight === undefined) throw new Error(`no ${kind} insight`);
  return insight;
};

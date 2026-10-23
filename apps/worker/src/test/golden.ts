import { join } from 'node:path';
import type { Fixture, Insight, MatchEvent } from '@matchiq/contracts';
import {
  findFixturesFolder,
  loadTemplateFile,
  type ParsedFixtureFile,
} from '@matchiq/db';
import { detectKeyMoments, project } from '@matchiq/football-engine';

export const GOLDEN_SCENARIOS = [
  'comeback',
  'disallowed-goal',
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

export const firstOfKind = (
  insights: readonly Insight[],
  kind: Insight['kind'],
): Insight => {
  const insight = insights.find((i) => i.kind === kind);
  if (insight === undefined) throw new Error(`no ${kind} insight`);
  return insight;
};

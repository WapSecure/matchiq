import {
  InsightList,
  InsightTraceList,
  MatchSnapshot,
  NarrativeList,
  OverlayList,
  RecapDocument,
} from '@matchiq/contracts';
import { NarrativeQuery } from '../../intelligence/intelligence.schemas';
import { TAGS } from '../openapi.constants';
import { type ApiRoute, json } from '../route-types';
import { FixturePath } from './fixture.routes';

export const INTELLIGENCE_ROUTES: readonly ApiRoute[] = [
  {
    operationId: 'getMatchState',
    method: 'get',
    path: '/fixtures/{fixtureId}/state',
    tag: TAGS.intelligence,
    summary: 'Latest deterministic match snapshot',
    description:
      'Every statistic comes from the football engine. Use it to recover after a stream gap.',
    auth: { kind: 'public' },
    params: FixturePath,
    success: {
      status: 200,
      description: 'Snapshot',
      body: json(MatchSnapshot),
    },
    problems: ['validation', 'fixtureNotFound', 'stateNotFound'],
  },
  {
    operationId: 'listInsights',
    method: 'get',
    path: '/fixtures/{fixtureId}/insights',
    tag: TAGS.intelligence,
    summary: 'Detected insights with their evidence',
    auth: { kind: 'public' },
    params: FixturePath,
    success: {
      status: 200,
      description: 'Insights',
      body: json(InsightList),
    },
    problems: ['validation', 'fixtureNotFound'],
  },
  {
    operationId: 'listNarratives',
    method: 'get',
    path: '/fixtures/{fixtureId}/narratives',
    tag: TAGS.intelligence,
    summary: 'Published narratives, optionally for one persona and locale',
    auth: { kind: 'public' },
    params: FixturePath,
    query: NarrativeQuery,
    success: {
      status: 200,
      description: 'Narratives',
      body: json(NarrativeList),
    },
    problems: ['validation', 'fixtureNotFound'],
  },
  {
    operationId: 'listOverlays',
    method: 'get',
    path: '/fixtures/{fixtureId}/overlays',
    tag: TAGS.intelligence,
    summary: 'Overlay cues published for the fixture',
    auth: { kind: 'public' },
    params: FixturePath,
    success: {
      status: 200,
      description: 'Overlay cues',
      body: json(OverlayList),
    },
    problems: ['validation', 'fixtureNotFound'],
  },
  {
    operationId: 'getRecap',
    method: 'get',
    path: '/fixtures/{fixtureId}/recap',
    tag: TAGS.intelligence,
    summary: 'Full-time recap document',
    description:
      '`404 recap-not-ready` until the match has ended; poll or wait for full time.',
    auth: { kind: 'public' },
    params: FixturePath,
    success: {
      status: 200,
      description: 'Recap',
      body: json(RecapDocument),
    },
    problems: ['validation', 'fixtureNotFound', 'recapNotReady'],
  },
  {
    operationId: 'listAgentRuns',
    method: 'get',
    path: '/fixtures/{fixtureId}/agent-runs',
    tag: TAGS.intelligence,
    summary: 'Agent runs, gate verdicts and editorial decisions per insight',
    description: 'The Agent Observatory. Holds no prompts or secrets.',
    auth: { kind: 'public' },
    params: FixturePath,
    success: {
      status: 200,
      description: 'Insight traces',
      body: json(InsightTraceList),
    },
    problems: ['validation', 'fixtureNotFound'],
  },
];

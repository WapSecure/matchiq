import {
  InsightList,
  InsightTraceList,
  MatchSnapshot,
  NarrativeList,
  OverlayList,
  RecapDocument,
} from '@matchiq/contracts';
import { API_LIMITS } from '../../constants';
import {
  MatchListQuery,
  NarrativeQuery,
} from '../../intelligence/intelligence.schemas';
import { KEYSET_TEXT, TAGS } from '../openapi.constants';
import { type ApiRoute, json } from '../route-types';
import { FixturePath } from './fixture.routes';

const MATCH_LIST_TEXT = `${KEYSET_TEXT} A cursor is bound to its match. \`limit\` defaults to and is capped at ${API_LIMITS.matchListMax}, so a call without a cursor returns the whole list for matches up to that size.`;

export const INTELLIGENCE_ROUTES: readonly ApiRoute[] = [
  {
    operationId: 'getMatchState',
    method: 'get',
    path: '/fixtures/{fixtureId}/state',
    tag: TAGS.intelligence,
    summary: 'Latest deterministic match snapshot',
    description:
      'Every statistic comes from the football engine. Use it to recover after a stream gap.',
    auth: 'fixtures:read',
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
    description: `Detection order, \`(detectedSequence, insightId)\`. ${MATCH_LIST_TEXT}`,
    auth: 'insights:read',
    params: FixturePath,
    query: MatchListQuery,
    success: {
      status: 200,
      description: 'One page of insights, with the total',
      body: json(InsightList),
    },
    problems: ['validation', 'fixtureNotFound', 'invalidCursor'],
  },
  {
    operationId: 'listNarratives',
    method: 'get',
    path: '/fixtures/{fixtureId}/narratives',
    tag: TAGS.intelligence,
    summary: 'Published narratives, optionally for one persona and locale',
    description: `Insight order, then persona, locale and id. \`total\` counts the narratives the filters match. ${MATCH_LIST_TEXT}`,
    auth: 'insights:read',
    params: FixturePath,
    query: NarrativeQuery,
    success: {
      status: 200,
      description: 'One page of narratives, with the total',
      body: json(NarrativeList),
    },
    problems: ['validation', 'fixtureNotFound', 'invalidCursor'],
  },
  {
    operationId: 'listOverlays',
    method: 'get',
    path: '/fixtures/{fixtureId}/overlays',
    tag: TAGS.intelligence,
    summary: 'Overlay cues published for the fixture',
    description: `Cues that went on air, in publication order, \`(publishedSequence, overlayId)\`. ${MATCH_LIST_TEXT}`,
    auth: 'overlays:read',
    params: FixturePath,
    query: MatchListQuery,
    success: {
      status: 200,
      description: 'One page of overlay cues, with the total',
      body: json(OverlayList),
    },
    problems: ['validation', 'fixtureNotFound', 'invalidCursor'],
  },
  {
    operationId: 'getRecap',
    method: 'get',
    path: '/fixtures/{fixtureId}/recap',
    tag: TAGS.intelligence,
    summary: 'Full-time recap document',
    description:
      '`404 recap-not-ready` until the match has ended; poll or wait for full time.',
    auth: 'insights:read',
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
    description: `The Agent Observatory. Holds no prompts or secrets. One trace per insight, in detection order. ${MATCH_LIST_TEXT}`,
    auth: 'agents:traces:read',
    params: FixturePath,
    query: MatchListQuery,
    success: {
      status: 200,
      description: 'One page of insight traces, with the total',
      body: json(InsightTraceList),
    },
    problems: ['validation', 'fixtureNotFound', 'invalidCursor'],
  },
];

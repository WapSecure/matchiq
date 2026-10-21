import { z } from 'zod';
import {
  AgentResult,
  AgentRun,
  FactPacket,
  VerificationResult,
} from './agents.js';
import { MatchEvent } from './events.js';
import { Fixture } from './fixture.js';
import { HealthStatus, ProblemDetails } from './http.js';
import { EvidenceEnvelope, Insight } from './insight.js';
import { Narrative } from './narrative.js';
import { OverlayCue } from './overlay.js';
import { PipelineRequest, PipelineResult } from './pipeline.js';
import { MatchSnapshot } from './snapshot.js';

/** Contracts exported for non-TypeScript consumers (the Python agents service). */
export const CROSS_LANGUAGE_CONTRACTS = {
  Fixture,
  MatchEvent,
  MatchSnapshot,
  EvidenceEnvelope,
  Insight,
  FactPacket,
  AgentResult,
  VerificationResult,
  AgentRun,
  Narrative,
  OverlayCue,
  PipelineRequest,
  PipelineResult,
  ProblemDetails,
  HealthStatus,
} as const;

export type CrossLanguageContractName = keyof typeof CROSS_LANGUAGE_CONTRACTS;

export const toContractJsonSchema = (name: CrossLanguageContractName) =>
  z.toJSONSchema(CROSS_LANGUAGE_CONTRACTS[name], {
    target: 'draft-2020-12',
    io: 'input',
    unrepresentable: 'throw',
    override: ({ jsonSchema }) => {
      // `format` (date-time, uuid, …) is authoritative; Zod's duplicate regex cannot be applied
      // by generators that parse these strings into native types.
      if (jsonSchema.format) delete jsonSchema.pattern;
    },
  });

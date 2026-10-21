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
      // `format` already enforces RFC 3339; Zod's extra regex is unenforceable on parsed datetimes.
      if (jsonSchema.format === 'date-time') delete jsonSchema.pattern;
    },
  });

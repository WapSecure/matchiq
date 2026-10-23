import { createServer, type IncomingMessage, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import {
  PipelineRequest,
  type AgentRun,
  type AgentStep,
  type PipelineResult,
} from '@matchiq/contracts';
import {
  templateDrafts,
  templateOverlay,
} from '../app/pipeline/templates/template-narratives';

/**
 * A stand-in for the agents service's `POST /api/v1/pipeline/runs`. Its
 * drafts reuse the template copy marked as AGENT, so they are grounded unless
 * a test tampers with them.
 */
export const fakePipelineResult = (
  request: PipelineRequest,
  fixture: Parameters<typeof templateDrafts>[1],
): PipelineResult => {
  const { packet } = request;
  const run: AgentRun = {
    runId: packet.runId,
    correlationId: packet.correlationId,
    agent: 'NARRATIVE_WRITER',
    provider: 'mock',
    promptVersion: '1.0.0',
    startedAt: '2026-10-24T15:00:00.000Z',
    latencyMs: 12,
    retries: 0,
    outcome: 'SUCCEEDED',
  };
  const evidence = packet.insight.evidence;
  const step = (stepIndex: number, role: AgentStep['role']): AgentStep => ({
    stepIndex,
    role,
    runId: packet.runId,
    correlationId: packet.correlationId,
    agentVersion: { promptVersion: '1.0.0' },
    provider: 'mock',
    fromStatus: stepIndex === 0 ? 'DETECTED' : 'ANALYZED',
    toStatus: stepIndex === 0 ? 'ANALYZED' : 'DRAFTED',
    decision: 'PASS',
    reasonCode: stepIndex === 0 ? 'GROUNDED' : 'DRAFTED',
    reason: 'fake agents step',
    inputChecksum: 'a'.repeat(64),
    evidenceEventIds: evidence.eventIds.slice(0, 3),
    metricRefs: Object.keys(evidence.computedMetrics).slice(0, 2),
    startedAt: '2026-10-24T15:00:00.000Z',
    latencyMs: 12,
    retries: 0,
  });
  const narratives = templateDrafts(packet.insight, fixture, {
    personas: request.personas,
    locales: request.locales,
  }).map((d) => ({
    ...d,
    source: 'AGENT' as const,
    headline: `Agent: ${d.headline}`,
  }));
  const overlay = templateOverlay(packet.insight, fixture);
  return {
    schemaVersion: 1,
    runId: packet.runId,
    correlationId: packet.correlationId,
    status: 'VERIFIED',
    analysis: null,
    verification: { verdict: 'PASS', issues: [] },
    narratives,
    overlay: { ...overlay, headline: `Agent: ${overlay.headline}` },
    runs: [run],
    steps: [step(0, 'MATCH_ANALYST'), step(1, 'NARRATIVE_WRITER')],
  };
};

export type FakeBehaviour = (request: PipelineRequest) => {
  status: number;
  body: unknown;
  delayMs?: number;
};

export interface FakeAgentsServer {
  readonly url: string;
  readonly requests: PipelineRequest[];
  readonly authorizations: (string | undefined)[];
  /** W3C `traceparent` of each pipeline call (undefined when tracing is off). */
  readonly traceparents: (string | undefined)[];
  behave(behaviour: FakeBehaviour): void;
  close(): Promise<void>;
}

const readBody = async (req: IncomingMessage): Promise<string> => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk as Buffer));
  return Buffer.concat(chunks).toString('utf8');
};

export const startFakeAgents = async (
  initial: FakeBehaviour,
): Promise<FakeAgentsServer> => {
  let behaviour = initial;
  const requests: PipelineRequest[] = [];
  const authorizations: (string | undefined)[] = [];
  const traceparents: (string | undefined)[] = [];
  const server: Server = createServer((req, res) => {
    void readBody(req).then((raw) => {
      if (req.url?.includes('/health')) {
        res.writeHead(200).end('{}');
        return;
      }
      authorizations.push(req.headers.authorization);
      traceparents.push(req.headers.traceparent as string | undefined);
      const request = PipelineRequest.parse(JSON.parse(raw));
      requests.push(request);
      const reply = behaviour(request);
      setTimeout(() => {
        if (res.destroyed) return;
        res.writeHead(reply.status, { 'content-type': 'application/json' });
        res.end(JSON.stringify(reply.body));
      }, reply.delayMs ?? 0);
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    requests,
    authorizations,
    traceparents,
    behave: (next) => {
      behaviour = next;
    },
    close: () =>
      new Promise((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
};

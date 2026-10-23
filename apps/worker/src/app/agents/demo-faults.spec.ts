import {
  FaultPlan,
  type Insight,
  type PipelineResult,
} from '@matchiq/contracts';
import { faultFor, tamperForGate } from './demo-faults';

const insight = (insightId: string, kind: Insight['kind']) =>
  ({ insightId, kind }) as Insight;

const INSIGHTS = [
  insight('in_1', 'GOAL'),
  insight('in_2', 'SHOT_BURST'),
  insight('in_3', 'GOAL'),
  insight('in_4', 'GOAL'),
];

describe('faultFor', () => {
  it('faults nothing without a plan', () => {
    expect(faultFor(undefined, INSIGHTS, 'in_1')).toBeUndefined();
  });

  it('faults every insight by default', () => {
    const plan = FaultPlan.parse({ scenario: 'WRITER_REVISE' });
    expect(INSIGHTS.map((i) => faultFor(plan, INSIGHTS, i.insightId))).toEqual([
      'WRITER_REVISE',
      'WRITER_REVISE',
      'WRITER_REVISE',
      'WRITER_REVISE',
    ]);
  });

  it('counts only the planned kinds, starting with the first', () => {
    const plan = FaultPlan.parse({
      scenario: 'MODEL_TIMEOUT',
      insightKinds: ['GOAL'],
      everyNth: 2,
    });
    expect(INSIGHTS.map((i) => faultFor(plan, INSIGHTS, i.insightId))).toEqual([
      'MODEL_TIMEOUT',
      undefined,
      undefined,
      'MODEL_TIMEOUT',
    ]);
  });

  it('ignores an insight that is not in the list', () => {
    const plan = FaultPlan.parse({ scenario: 'GATE_REJECT' });
    expect(faultFor(plan, INSIGHTS, 'in_9')).toBeUndefined();
  });
});

describe('tamperForGate', () => {
  const draft = {
    persona: 'CASUAL',
    locale: 'en-GB',
    citedValues: [],
  } as unknown as PipelineResult['narratives'][number];

  it('adds an ungrounded citation to the first agent draft and labels the runs', () => {
    const result = {
      narratives: [
        { ...draft, source: 'TEMPLATE' },
        { ...draft, source: 'AGENT' },
      ],
      runs: [{ agent: 'NARRATIVE_WRITER' }, { agent: 'FACT_CHECKER' }],
    } as unknown as PipelineResult;
    const tampered = tamperForGate(result);
    expect(tampered.narratives[0]?.citedValues).toEqual([]);
    expect(tampered.narratives[1]?.citedValues).toEqual([
      { metricRef: 'fault.injected', value: 99 },
    ]);
    expect(tampered.runs.map((r) => r.faultInjected)).toEqual([
      'GATE_REJECT',
      'GATE_REJECT',
    ]);
    expect(tampered.runs[0]?.faultNote).toContain('CASUAL en-GB');
    expect(tampered.runs[1]?.faultNote).toBeUndefined();
  });
});

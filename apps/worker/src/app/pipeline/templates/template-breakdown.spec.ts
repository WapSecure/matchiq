import {
  CONTEXT_REFS,
  InsightKind,
  MomentContext,
  NarrativeDraft,
  type Insight,
} from '@matchiq/contracts';
import { GOLDEN_SCENARIOS, goldenPipelineRun } from '../../../test/golden';
import { LOCALES } from '../../constants';
import { breakdownIssues } from '../gate/breakdown-gate';
import { gateNarrative } from '../gate/publish-gate';
import { gateContextOf } from '../publication';
import { unsupportedNumerals } from '../gate/text-checks';
import { templateBreakdown } from './template-breakdown';
import { templateDraft } from './template-narratives';

const PARTS = ['whatHappened', 'whyItMatters', 'whatToWatch'] as const;

const runs = Promise.all(
  GOLDEN_SCENARIOS.map((name) => goldenPipelineRun(name)),
);

describe('template Analyst breakdown', () => {
  it('gives every detected moment context that matches the contract', async () => {
    for (const run of await runs) {
      for (const { insight } of run.insights) {
        expect(MomentContext.safeParse(insight.context).success).toBe(true);
      }
    }
  });

  it('passes the gate for every moment type and locale, citing every number', async () => {
    const kinds = new Set<string>();
    for (const run of await runs) {
      for (const { insight } of run.insights) {
        kinds.add(insight.kind);
        for (const locale of LOCALES) {
          const draft = templateDraft(insight, run.fixture, {
            persona: 'ANALYST',
            locale,
          });
          const ctx = gateContextOf(insight, run.fixture);
          expect(breakdownIssues(draft, ctx)).toEqual([]);
          const parts = PARTS.map((part) => draft.breakdown?.[part]);
          const unsupported = parts.flatMap((p) =>
            p === undefined
              ? ['missing part']
              : unsupportedNumerals(
                  p.text,
                  locale,
                  p.citedValues.map((c) => c.value),
                ),
          );
          expect(unsupported).toEqual([]);
        }
      }
    }
    expect(kinds.size).toBeGreaterThanOrEqual(4);
  });

  it('cites the engine context in why it matters', async () => {
    const [run] = await runs;
    const goal = run?.insights.find((i) => i.insight.kind === 'GOAL')?.insight;
    if (run === undefined || goal?.context === undefined)
      throw new Error('no goal');
    const why = templateBreakdown(goal, run.fixture, 'en-GB').whyItMatters;
    expect(why.citedValues).toContainEqual({
      metricRef: CONTEXT_REFS.minute,
      value: goal.context.metrics[CONTEXT_REFS.minute],
    });
    expect(why.text).toContain(
      `minute ${goal.context.metrics[CONTEXT_REFS.minute]}`,
    );
  });

  it('still reads without context, and never for Fan or Broadcast', async () => {
    const [run] = await runs;
    const found = run?.insights[0]?.insight;
    if (run === undefined || found === undefined) throw new Error('no moment');
    const bare: Insight = { ...found };
    delete bare.context;
    const parts = templateBreakdown(bare, run.fixture, 'fr-FR');
    expect(parts.whyItMatters.text.length).toBeGreaterThan(0);
    for (const persona of ['CASUAL', 'BROADCAST'] as const) {
      const draft = templateDraft(found, run.fixture, {
        persona,
        locale: 'en-GB',
      });
      expect(draft.breakdown).toBeUndefined();
    }
    expect(InsightKind.options).toContain(found.kind);
  });
});

describe('breakdown gate', () => {
  const analystOf = async () => {
    const [run] = await runs;
    const insight = run?.insights.find(
      (i) => i.insight.context?.comparison,
    )?.insight;
    if (run === undefined || insight === undefined)
      throw new Error('no moment');
    const draft = templateDraft(insight, run.fixture, {
      persona: 'ANALYST',
      locale: 'en-GB',
    });
    return { draft, ctx: gateContextOf(insight, run.fixture) };
  };

  it('drops a breakdown with a number that is not cited, keeping the narrative', async () => {
    const { draft, ctx } = await analystOf();
    const breakdown = draft.breakdown;
    if (breakdown === undefined) throw new Error('no breakdown');
    const tampered = NarrativeDraft.parse({
      ...draft,
      breakdown: {
        ...breakdown,
        whatToWatch: {
          ...breakdown.whatToWatch,
          text: 'Watch for 7 more chances.',
        },
      },
    });
    expect(breakdownIssues(tampered, ctx).map((i) => i.code)).toContain(
      'UNSUPPORTED_NUMBER',
    );
    const verdict = gateNarrative(tampered, ctx);
    expect(verdict.ok && verdict.value.breakdown).toBe(undefined);
  });

  it('rejects a cited context value that differs from the engine', async () => {
    const { draft, ctx } = await analystOf();
    const breakdown = draft.breakdown;
    if (breakdown === undefined) throw new Error('no breakdown');
    const why = breakdown.whyItMatters;
    const wrong = {
      ...draft,
      breakdown: {
        ...breakdown,
        whyItMatters: {
          ...why,
          citedValues: why.citedValues.map((c) => ({
            ...c,
            value: c.value + 1,
          })),
        },
      },
    };
    expect(breakdownIssues(wrong, ctx).length).toBeGreaterThan(0);
  });

  it('flags a metric cited in more than one part', async () => {
    const { draft, ctx } = await analystOf();
    const breakdown = draft.breakdown;
    const cited = breakdown?.whyItMatters.citedValues[0];
    if (breakdown === undefined || cited === undefined)
      throw new Error('no cite');
    const repeated = {
      ...draft,
      breakdown: {
        ...breakdown,
        whatToWatch: { ...breakdown.whatToWatch, citedValues: [cited] },
      },
    };
    expect(breakdownIssues(repeated, ctx).map((i) => i.code)).toContain(
      'REPETITION',
    );
  });

  it('refuses a breakdown on a Fan narrative', async () => {
    const { draft, ctx } = await analystOf();
    const fan = { ...draft, persona: 'CASUAL' as const };
    expect(breakdownIssues(fan, ctx).map((i) => i.code)).toEqual([
      'SCHEMA_VIOLATION',
    ]);
  });
});

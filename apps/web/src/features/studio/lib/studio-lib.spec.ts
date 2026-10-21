import { shot } from '@/test/factories';
import { template } from '@/test/session-factories';
import { stubApi } from '@/test/stub-api';
import { describeMetric } from '@/lib/metric-definition';
import { templateOfSession } from '../hooks/use-session-template';
import { resolveEvents } from './resolve-events';

describe('resolveEvents', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('walks ledger pages until every id is found', async () => {
    const page = (from: number) =>
      Array.from({ length: 500 }, (_, i) => shot(from + i));
    const api = stubApi({
      'GET /events': (url) => {
        const after = Number(url.searchParams.get('afterSequence'));
        return { body: { items: page(after + 1), nextAfterSequence: null } };
      },
    });
    const found = await resolveEvents('fx_x', ['ev_10', 'ev_700']);
    expect(found.map((e) => e.eventId)).toEqual(['ev_10', 'ev_700']);
    expect(api).toHaveBeenCalledTimes(2);
  });

  it('stops at the page budget for ids that never appear', async () => {
    const api = stubApi({
      'GET /events': () => ({
        body: {
          items: Array.from({ length: 500 }, (_, i) => shot(i)),
          nextAfterSequence: null,
        },
      }),
    });
    await expect(
      resolveEvents('fx_x', ['ev_missing'], undefined, 3),
    ).resolves.toEqual([]);
    expect(api).toHaveBeenCalledTimes(3);
  });
});

describe('templateOfSession', () => {
  it('maps a session to the longest matching template id', () => {
    const templates = [
      template({ templateId: 'fx_comeback' }),
      template({ templateId: 'fx_comeback_42' }),
    ];
    expect(templateOfSession('fx_comeback_42_s3', templates)?.templateId).toBe(
      'fx_comeback_42',
    );
    expect(templateOfSession('fx_other_s1', templates)).toBeNull();
  });
});

describe('describeMetric', () => {
  it('labels engine metric refs with side, window and formula', () => {
    expect(describeMetric('pressures.away.rolling5m')).toEqual({
      label: 'Pressures (away, latest 5 min)',
      formula: 'count(PRESSURE_APPLIED)',
    });
    expect(describeMetric('unknown.ref')).toEqual({
      label: 'unknown.ref',
      formula: null,
    });
  });
});

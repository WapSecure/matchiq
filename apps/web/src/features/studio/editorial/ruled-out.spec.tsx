import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from '@/lib/api/query-provider';
import { render, screen } from '@testing-library/react';
import { TraceCard } from '@/features/observatory/trace-card';
import { RecapMomentItem } from '@/features/recap/recap-moment';
import { FX, message, narrative } from '@/test/factories';
import { moment, trace } from '@/test/session-factories';
import { initialMatchData, reduceMessages } from '../store';
import { insightMarks } from './insight-marks';

const REASON = 'Goal ruled out: offside in the build-up';
const RULED_OUT = /Goal ruled out\. Removed from air\./;

describe('a moment ruled out by a correction', () => {
  it('is marked from the stream and its write-ups are withdrawn', () => {
    const state = reduceMessages(initialMatchData(FX), [
      message('narrative.ready', narrative(), 1),
      message(
        'insight.retract',
        {
          insightId: 'in_1',
          cause: 'CORRECTION',
          causeEventId: 'ev_000296',
          reason: REASON,
        },
        2,
      ),
      message('narrative.ready', narrative({ locale: 'fr-FR' }), 3),
    ]);
    expect(state.ruledOut).toEqual({ in_1: REASON });
    expect(state.narratives.in_1).toBeUndefined();
    expect(insightMarks(undefined, {}, state.ruledOut)('in_1')).toMatchObject({
      labels: ['Ruled out'],
      retracted: true,
      retractedReason: REASON,
      suppressed: false,
    });
  });

  it('reads plainly in the recap instead of its narrative', () => {
    render(
      <ul>
        <RecapMomentItem
          moment={moment({ kind: 'GOAL', retracted: { reason: REASON } })}
          team={null}
          persona="BROADCAST"
          locale="en-GB"
        />
      </ul>,
    );
    expect(screen.getByRole('note')).toHaveTextContent(RULED_OUT);
    const note = screen.getByRole('note');
    expect(note).toHaveTextContent('Why: Offside in the build-up');
    expect(note).not.toHaveTextContent(/Why: Goal ruled out/);
  });

  it('reads plainly in the fact-checks', () => {
    render(
      <QueryClientProvider client={createQueryClient()}>
        <TraceCard
          trace={trace({
            kind: 'GOAL',
            editorial: {
              insight: 'RETRACTED',
              insightReason: REASON,
              overlay: 'RETRACTED',
              overlayReason: REASON,
            },
          })}
          period={1}
          variants={null}
        />
      </QueryClientProvider>,
    );
    expect(screen.getByRole('note')).toHaveTextContent(RULED_OUT);
    expect(screen.getByRole('note')).toHaveTextContent(
      'Why: Offside in the build-up',
    );
  });
});
